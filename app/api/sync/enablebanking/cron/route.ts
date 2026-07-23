import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import {
  defaultCategorizer,
  loadLearnedIndex,
  EMPTY_LEARNED_INDEX,
  type DbCategorizationRule,
} from '@/lib/categories'
import { getConsentStatus } from '@/lib/accounts'
import { syncEbAccount } from '@/lib/ingest'
import { sendPushToUser, selectAccountsToNotify, type NotifiableAccount } from '@/lib/push'
import { safeBearerMatch } from '@/lib/http/bearer'

// Barrido nocturno de todas las conexiones de Enable Banking. La ingesta por
// cuenta la hace `lib/ingest/enablebanking`, compartida con el sync manual
// (#331); aquí quedan el barrido multi-hogar, el reporte de fallos y el aviso de
// caducidad — notificar no es responsabilidad de la ingesta (#309).
const TAG = '[sync/eb/cron]'

export async function POST(req: Request) {
  const secret = process.env.ENABLEBANKING_WEBHOOK_SECRET
  if (!secret) {
    console.error(`${TAG} ENABLEBANKING_WEBHOOK_SECRET no configurado`)
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  if (!safeBearerMatch(req.headers.get('authorization'), secret)) {
    return new NextResponse(null, { status: 401 })
  }

  const db = createServiceClient()

  const { data: accounts, error: accountsError } = await db
    .from('accounts')
    .select('id, user_id, household_id, name, external_id, session_id, last_synced, consent_expires_at, consent_reminder_sent_for')
    .eq('source', 'enablebanking')
    .eq('is_active', true)

  if (accountsError) {
    console.error(`${TAG} fetch accounts:`, accountsError)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  if (!accounts || accounts.length === 0) {
    return NextResponse.json({ synced: 0, accounts: 0, skipped: [], failed: [] })
  }

  // Caducidad PSD2: se saltan las conexiones caducadas (o sin fecha) y se
  // refleja el motivo en la respuesta del cron (issue #78).
  const nowMs = Date.now()
  const skipped: { account_id: string; reason: string }[] = []
  const syncable = accounts.filter(account => {
    const expiry = account.consent_expires_at
      ? new Date(account.consent_expires_at as string).getTime()
      : 0
    if (!expiry || expiry <= nowMs) {
      skipped.push({ account_id: account.id as string, reason: 'consent_expired' })
      return false
    }
    return true
  })

  const householdIds = Array.from(new Set(syncable.map(a => a.household_id as string)))
  const { data: rulesData, error: rulesError } = await db
    .from('categorization_rules')
    .select('household_id, pattern, field, category_id')
    .in('household_id', householdIds)
    .eq('is_active', true)
    .order('priority', { ascending: false })

  if (rulesError) {
    console.error(`${TAG} fetch rules:`, rulesError)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  const rulesByHousehold = new Map<string, DbCategorizationRule[]>()
  for (const { household_id, pattern, field, category_id } of rulesData ?? []) {
    const rule: DbCategorizationRule = { pattern, field, category_id }
    const list = rulesByHousehold.get(household_id)
    if (list) list.push(rule)
    else rulesByHousehold.set(household_id, [rule])
  }

  // Reglas aprendidas (#359). A diferencia de las explícitas, el RPC agrega por
  // hogar, así que se pide una vez por hogar y en paralelo: son unos pocos hogares
  // y la alternativa sería recalcular el voto en cada cuenta.
  const learnedByHousehold = new Map(
    await Promise.all(
      householdIds.map(
        async id => [id, await loadLearnedIndex(db, id)] as const
      )
    )
  )

  let totalSynced = 0
  const failed: { account_id: string; error: string }[] = []

  for (const account of syncable) {
    // Cada cuenta se atribuye a su propio dueño: el cron barre todos los hogares.
    const owner = {
      userId: account.user_id as string,
      householdId: account.household_id as string,
    }
    const dbRules = rulesByHousehold.get(owner.householdId) ?? []
    const learned = learnedByHousehold.get(owner.householdId) ?? EMPTY_LEARNED_INDEX

    const result = await syncEbAccount(db, {
      account,
      owner,
      categorize: defaultCategorizer({ dbRules, learned }),
      tag: TAG,
    })

    if (result.ok) totalSynced += result.upserted
    else failed.push({ account_id: account.id as string, error: result.error })
  }

  // Aviso de caducidad PSD2 (≤7 días, issue #115). Se evalúa sobre todas las
  // cuentas (las críticas siguen siendo sincronizables) y se manda una sola vez
  // por ciclo de caducidad gracias a consent_reminder_sent_for.
  const notified = await notifyExpiringConsents(db, accounts)

  return NextResponse.json({
    synced: totalSynced,
    accounts: syncable.length,
    skipped,
    failed,
    notified,
  })
}

type CronDb = ReturnType<typeof createServiceClient>

/**
 * Envía el aviso de caducidad PSD2 a los usuarios con cuentas en ventana crítica
 * y marca cada cuenta como notificada. Devuelve el nº de cuentas avisadas.
 */
async function notifyExpiringConsents(db: CronDb, accounts: NotifiableAccount[]): Promise<number> {
  const toNotify = selectAccountsToNotify(accounts)
  if (toNotify.length === 0) return 0

  // Agrupar por usuario: un push por usuario aunque tenga varias cuentas a punto.
  const byUser = new Map<string, NotifiableAccount[]>()
  for (const account of toNotify) {
    const list = byUser.get(account.user_id)
    if (list) list.push(account)
    else byUser.set(account.user_id, [account])
  }

  for (const [userId, userAccounts] of byUser) {
    const first = userAccounts[0]
    // Por construcción del agrupado nunca está vacío, pero el guard es barato.
    if (!first) continue
    const daysLeft = getConsentStatus(first.consent_expires_at).daysLeft
    const body =
      userAccounts.length === 1
        ? `Renueva la conexión de ${first.name} en los próximos ${daysLeft} día${daysLeft === 1 ? '' : 's'}.`
        : `${userAccounts.length} conexiones bancarias caducan en breve. Renuévalas para seguir sincronizando.`

    try {
      await sendPushToUser(db, userId, {
        title: 'Tu acceso bancario caduca pronto',
        body,
        url: '/accounts',
      })
    } catch (err) {
      console.error(`${TAG} push caducidad:`, err)
      continue
    }

    // Marcar como notificadas (idempotente por el valor de consent_expires_at).
    await Promise.all(
      userAccounts.map(account =>
        db
          .from('accounts')
          .update({ consent_reminder_sent_for: account.consent_expires_at })
          .eq('id', account.id)
      )
    )
  }

  return toNotify.length
}
