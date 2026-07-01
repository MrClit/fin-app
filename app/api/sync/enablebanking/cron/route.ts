import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getAccountTransactions } from '@/lib/enablebanking'
import { categorizeWithRules, type DbCategorizationRule } from '@/lib/categories'
import { getConsentStatus } from '@/lib/accounts'
import { sendPushToUser, selectAccountsToNotify, type NotifiableAccount } from '@/lib/push'
import { safeBearerMatch } from '@/lib/http/bearer'

export async function POST(req: Request) {
  const secret = process.env.ENABLEBANKING_WEBHOOK_SECRET
  if (!secret) {
    console.error('[sync/eb/cron] ENABLEBANKING_WEBHOOK_SECRET no configurado')
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
    console.error('[sync/eb/cron] fetch accounts:', accountsError)
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
    console.error('[sync/eb/cron] fetch rules:', rulesError)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  const rulesByHousehold = new Map<string, DbCategorizationRule[]>()
  for (const { household_id, pattern, field, category_id } of rulesData ?? []) {
    const rule: DbCategorizationRule = { pattern, field, category_id }
    const list = rulesByHousehold.get(household_id)
    if (list) list.push(rule)
    else rulesByHousehold.set(household_id, [rule])
  }

  let totalSynced = 0
  const failed: { account_id: string; error: string }[] = []

  for (const account of syncable) {
    if (!account.external_id || !account.session_id) continue

    const userId = account.user_id as string
    const householdId = account.household_id as string
    const dbRules = rulesByHousehold.get(householdId) ?? []
    const dateFrom = account.last_synced
      ? (account.last_synced as string).slice(0, 10)
      : undefined

    let ebTransactions
    try {
      ebTransactions = await getAccountTransactions(
        account.external_id,
        account.session_id,
        dateFrom
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`[sync/eb/cron] getTransactions ${account.external_id}:`, message)
      failed.push({ account_id: account.id as string, error: message })
      continue
    }

    if (ebTransactions.length > 0) {
      const rows = ebTransactions.map(tx => {
        const externalId = tx.entry_reference ?? tx.transaction_id
        const description =
          tx.remittance_information?.[0]?.trim() ||
          tx.creditor?.name ||
          tx.debtor?.name ||
          'Sin descripción'
        const merchant = tx.creditor?.name ?? tx.debtor?.name ?? undefined
        const sign = tx.credit_debit_indicator === 'DBIT' ? -1 : 1
        const amount = parseFloat(tx.transaction_amount.amount) * sign

        return {
          user_id:      userId,
          household_id: householdId,
          account_id:   account.id,
          date:         tx.booking_date,
          amount,
          description,
          category:     categorizeWithRules(dbRules, description, merchant ?? undefined),
          source:       'enablebanking' as const,
          external_id:  externalId,
        }
      })

      const { error: upsertError } = await db
        .from('transactions')
        .upsert(rows, { onConflict: 'household_id,external_id', ignoreDuplicates: true })

      if (upsertError) {
        console.error(`[sync/eb/cron] upsert ${account.external_id}:`, upsertError)
        failed.push({ account_id: account.id as string, error: upsertError.message })
        continue
      }

      totalSynced += rows.length
    }

    const lastTx = ebTransactions.at(-1)
    const balance = lastTx?.balance_after_transaction
      ? parseFloat(lastTx.balance_after_transaction.amount)
      : null
    await db
      .from('accounts')
      .update({ ...(balance !== null && { balance }), last_synced: new Date().toISOString() })
      .eq('id', account.id)
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
      console.error('[sync/eb/cron] push caducidad:', err)
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
