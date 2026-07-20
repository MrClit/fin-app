import type { TablesInsert } from '@/lib/supabase/database.types'
import { getDefaultHouseholdOwner } from '@/lib/household'
import type {
  Connector,
  IngestDb,
  IngestOutcome,
  NormalizedAccount,
  NormalizedTx,
} from './types'

/**
 * Pipeline de ingesta compartido por los tres webhooks de scrapers (issue #309).
 *
 * Devuelve un Result discriminado en vez de lanzar: estas rutas no van envueltas
 * en `withAuth`, así que no habría quién capturase un `RouteError`. El route
 * handler traduce el error a su respuesta con `ingestErrorResponse`.
 */

type OwnerContext = {
  userId: string
  householdId: string
  lastSyncedAt: string
}

type ResolvedAccount =
  | { ok: true; id: string; created: boolean }
  | { ok: false; error: { code: 'db_error' } }

const DB_ERROR = { ok: false, error: { code: 'db_error' } } as const

/** Localiza la cuenta del conector y la actualiza, o la crea si es el primer sync. */
async function resolveAccount(
  db: IngestDb,
  tag: string,
  ctx: OwnerContext,
  account: NormalizedAccount
): Promise<ResolvedAccount> {
  const { data: existing, error: selErr } = await db
    .from('accounts')
    .select('id')
    .eq('household_id', ctx.householdId)
    .eq('source', 'scraper')
    .eq(account.identity.by, account.identity.value)
    .maybeSingle()
  if (selErr) {
    console.error(`${tag} select account:`, selErr)
    return DB_ERROR
  }

  if (existing) {
    const id = existing.id as string
    // `name` no se incluye a propósito: sólo se fija en el INSERT, de modo que
    // un re-sync no pisa un renombrado hecho en BD (#313, mismo patrón que
    // `sort_order`).
    const { error: updErr } = await db
      .from('accounts')
      .update({
        balance: account.balance,
        last_synced: ctx.lastSyncedAt,
      })
      .eq('id', id)
    if (updErr) {
      console.error(`${tag} update account:`, updErr)
      return DB_ERROR
    }
    return { ok: true, id, created: false }
  }

  // `undefined` en el modelo normalizado = la columna no se emite. Ver ./types.
  const row: TablesInsert<'accounts'> = {
    user_id: ctx.userId,
    household_id: ctx.householdId,
    name: account.name,
    type: account.type,
    source: 'scraper',
    is_liability: account.isLiability,
    balance: account.balance,
    ...(account.number !== undefined && { number: account.number }),
    ...(account.identity.by === 'external_id' && { external_id: account.identity.value }),
    last_synced: ctx.lastSyncedAt,
    ...(account.sortOrder !== undefined && { sort_order: account.sortOrder }),
    currency: 'EUR',
  }

  const { data: inserted, error: insErr } = await db
    .from('accounts')
    .insert(row)
    .select('id')
    .single()
  if (insErr || !inserted) {
    console.error(`${tag} insert account:`, insErr)
    return DB_ERROR
  }
  return { ok: true, id: inserted.id as string, created: true }
}

function toTxRow(
  ctx: OwnerContext,
  accountId: string,
  tx: NormalizedTx,
  category: string | null
): TablesInsert<'transactions'> {
  // `is_read` se omite a propósito (issue #149): los inserts nuevos toman el
  // DEFAULT false (nacen "no leídos") y, como el upsert usa `ignoreDuplicates:
  // false` (actualiza las filas existentes), NO incluirlo evita que un re-sync
  // reescriba el estado de lectura de un movimiento ya leído.
  return {
    user_id: ctx.userId,
    household_id: ctx.householdId,
    account_id: accountId,
    date: tx.date,
    amount: tx.amount,
    description: tx.description,
    category,
    source: 'scraper',
    external_id: tx.externalId,
  }
}

export async function ingest<P>(
  db: IngestDb,
  connector: Connector<P>,
  payload: P
): Promise<IngestOutcome> {
  const tag = `[${connector.source}]`

  // El webhook no tiene sesión: se resuelve el hogar (y un user_id de
  // creador/auditoría) de forma determinista a partir del owner del hogar
  // (household_members.role = 'owner', el más antiguo). Issue #196.
  const owner = await getDefaultHouseholdOwner(db)
  if (!owner) {
    console.error(`${tag} no household owner`)
    return { ok: false, error: { code: 'no_owner' } }
  }

  const { lastSyncedAt, accounts } = connector.normalize(payload)
  const ctx: OwnerContext = { ...owner, lastSyncedAt }

  const categorize = await connector.prepareCategorizer(db, owner.householdId)

  let createdAccounts = 0
  // Las transacciones de todas las cuentas van a un único upsert al final, cada
  // fila con su account_id ya resuelto.
  const txRows: TablesInsert<'transactions'>[] = []

  for (const account of accounts) {
    const resolved = await resolveAccount(db, tag, ctx, account)
    if (!resolved.ok) return resolved
    if (resolved.created) createdAccounts++

    for (const tx of account.transactions) {
      txRows.push(toTxRow(ctx, resolved.id, tx, categorize(tx, account)))
    }
  }

  let upserted = 0
  if (txRows.length > 0) {
    const { error: upsertErr } = await db
      .from('transactions')
      .upsert(txRows, { onConflict: 'household_id,external_id', ignoreDuplicates: false })
    if (upsertErr) {
      console.error(`${tag} upsert transactions:`, upsertErr)
      return DB_ERROR
    }
    upserted = txRows.length
  }

  return { ok: true, data: { accounts: accounts.length, createdAccounts, upserted } }
}
