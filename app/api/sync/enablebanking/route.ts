import { NextResponse } from 'next/server'
import { withAuth, unwrap } from '@/lib/http/with-auth'
import { parseBody } from '@/lib/http/validation'
import { syncEnablebankingSchema } from '@/lib/schemas/banking'
import { createServiceClient } from '@/lib/supabase/service'
import { defaultCategorizer, loadLearnedIndex, type DbCategorizationRule } from '@/lib/categories'
import { syncEbAccount } from '@/lib/ingest'
import { SYNC_COOLDOWN_MS } from '@/lib/sync'

// Sync manual de Enable Banking. La ingesta en sí (pedir movimientos, upsertear
// y actualizar saldo) la hace `lib/ingest/enablebanking`, compartida con el cron
// (#331); aquí quedan la sesión, la selección de cuentas y el cooldown.
const TAG = '[sync/eb]'

export const POST = withAuth('/api/sync/enablebanking', async ({ user, householdId }, request) => {
  // Body opcional: `{ accountId }` limita la sync a una sola cuenta (issue #79,
  // sync inmediata tras renovar). Sin body, se sincronizan todas.
  const { accountId } = await parseBody(request, syncEnablebankingSchema)

  // All DB writes via service client (bypasses RLS)
  const db = createServiceClient()

  let accountsQuery = db
    .from('accounts')
    .select('id, external_id, session_id, last_synced')
    .eq('household_id', householdId)
    .eq('source', 'enablebanking')
    .eq('is_active', true)
    // Caducidad PSD2: no se sincronizan conexiones caducadas (issue #78).
    // `.gt` también descarta las filas con consent_expires_at NULL.
    .gt('consent_expires_at', new Date().toISOString())
  if (accountId) accountsQuery = accountsQuery.eq('id', accountId)

  const [accountsResult, rulesResult, learned] = await Promise.all([
    accountsQuery,
    db
      .from('categorization_rules')
      .select('pattern, field, category_id')
      .eq('household_id', householdId)
      .eq('is_active', true)
      .order('priority', { ascending: false }),
    // Reglas aprendidas de las correcciones del hogar (#359). Un único punto
    // asíncrono más, resuelto aquí junto al resto y no por movimiento.
    loadLearnedIndex(db, householdId),
  ])

  const accounts = unwrap(accountsResult, { op: 'list-accounts' })
  const dbRules: DbCategorizationRule[] = rulesResult.data ?? []

  if (!accounts || accounts.length === 0) {
    return NextResponse.json({ synced: 0, accounts: 0 })
  }

  // Rate limit: EB permite 4 syncs/día. Se exige un cooldown de 6h desde la
  // última sincronización (manual o cron — ambas escriben last_synced).
  const lastSyncedMs = accounts
    .map(a => (a.last_synced ? new Date(a.last_synced as string).getTime() : 0))
    .filter(t => t > 0)
  if (lastSyncedMs.length > 0) {
    const availableAt = Math.max(...lastSyncedMs) + SYNC_COOLDOWN_MS
    if (availableAt > Date.now()) {
      return NextResponse.json(
        { error: 'cooldown', availableAt: new Date(availableAt).toISOString() },
        { status: 429 }
      )
    }
  }

  // Los movimientos se atribuyen al usuario de la sesión, no al `user_id` de la
  // fila de cuenta (que es quien la conectó): en un hogar compartido, sincroniza
  // quien pulsa.
  const owner = { userId: user.id, householdId }
  const categorize = defaultCategorizer({ dbRules, learned })

  let totalSynced = 0

  for (const account of accounts) {
    const result = await syncEbAccount(db, { account, owner, categorize, tag: TAG })
    if (result.ok) totalSynced += result.upserted
  }

  return NextResponse.json({ synced: totalSynced, accounts: accounts.length })
})
