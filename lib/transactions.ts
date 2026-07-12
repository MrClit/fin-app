import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import type { TransactionCursor } from '@/lib/pagination'
import { unwrap } from '@/lib/http/route-error'
import { narrowUnions } from '@/lib/supabase/rows'
import type { TransactionWithAccount } from '@/types'

type Db = SupabaseClient<Database>

export interface TxDayGroup {
  date: string
  transactions: TransactionWithAccount[]
  net: number
}

export function groupTxByDate(txs: TransactionWithAccount[]): TxDayGroup[] {
  const map = new Map<string, TxDayGroup>()
  for (const tx of txs) {
    const existing = map.get(tx.date)
    if (existing) {
      existing.transactions.push(tx)
      existing.net += tx.amount
    } else {
      map.set(tx.date, { date: tx.date, transactions: [tx], net: tx.amount })
    }
  }
  return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date))
}

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export const toLocalISODate = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export function formatDayLabel(dateStr: string): string {
  const now = new Date()
  const today = toLocalISODate(now)
  const yest = new Date(now)
  yest.setDate(yest.getDate() - 1)
  const yesterdayStr = toLocalISODate(yest)
  if (dateStr === today) return 'Hoy'
  if (dateStr === yesterdayStr) return 'Ayer'
  const [y, m, d] = dateStr.split('-').map(Number)
  return `${d} ${MONTHS[m - 1]} ${y}`
}

// ─── Acceso a datos ──────────────────────────────────────────────────────────
//
// El cliente Supabase entra por parámetro (igual que `buildAnalyticsResponse`):
// la página lo obtiene de `getRequestClient()` y los route handlers del contexto
// de `withAuth`, así que ambos comparten estas consultas sin que este módulo
// importe nada server-only. Toda la regla de negocio (ventana, orden, cursor)
// vive aquí y sólo aquí (issue #306).

/** Ventana por defecto de la lista de movimientos, en días (spec §7.1). */
export const TX_WINDOW_DAYS = 90

/** Tamaño de página por defecto de la lista, y techo que acepta la API. */
export const TX_PAGE_SIZE = 200
export const TX_MAX_PAGE_SIZE = 500

/** Movimiento + la cuenta a la que pertenece: la forma que consume la UI. */
const TX_SELECT = '*, account:accounts(id, name, color)'

/**
 * Primer día incluido en la ventana, como `YYYY-MM-DD`.
 *
 * En fecha **local**, no UTC: `toISOString()` habría devuelto el día anterior
 * durante la madrugada española (UTC+1/+2), ensanchando la ventana a 91 días de
 * forma intermitente. `now` es inyectable para poder fijarlo en los tests.
 */
export function getWindowCutoff(now: Date = new Date()): string {
  const cutoff = new Date(now)
  cutoff.setDate(cutoff.getDate() - TX_WINDOW_DAYS)
  return toLocalISODate(cutoff)
}

export interface ListTransactionsOptions {
  /** Máximo de movimientos a devolver. Por defecto `TX_PAGE_SIZE`. */
  limit?: number
  /** Cursor keyset de la página anterior; `null` para la primera. */
  cursor?: TransactionCursor | null
  accountIds?: string[]
  category?: string | null
  /** Si se pasa, sustituye al cutoff de la ventana como límite inferior. */
  dateFrom?: string | null
  dateTo?: string | null
  /** Sólo para tests: fija el «hoy» del que se deriva el cutoff. */
  now?: Date
}

export interface TransactionsPage {
  items: TransactionWithAccount[]
  /** Cursor de la página siguiente, o `null` si no hay más. */
  nextCursor: TransactionCursor | null
}

/**
 * Página de movimientos ordenada por `(date, id)` descendente.
 *
 * La ventana de `TX_WINDOW_DAYS` sólo acota la **primera** página sin filtro de
 * fecha explícito: con `dateFrom` manda el filtro del usuario, y al paginar manda
 * el cursor (si no, la ventana recortaría las páginas siguientes y el scroll
 * infinito se quedaría corto).
 */
export async function listTransactions(
  supabase: Db,
  householdId: string,
  opts: ListTransactionsOptions = {}
): Promise<TransactionsPage> {
  const { cursor, accountIds, category, dateFrom, dateTo, now } = opts
  const limit = opts.limit ?? TX_PAGE_SIZE

  // Pedimos limit + 1 para distinguir "exactamente limit ítems quedan" de "hay más".
  let query = supabase
    .from('transactions')
    .select(TX_SELECT)
    .eq('household_id', householdId)
    .order('date', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit + 1)

  if (dateFrom)      query = query.gte('date', dateFrom)
  else if (!cursor)  query = query.gte('date', getWindowCutoff(now))
  if (dateTo)        query = query.lte('date', dateTo)

  if (cursor) {
    // Keyset: (date, id) DESC → traer items "después" del cursor.
    query = query.or(
      `date.lt.${cursor.date},and(date.eq.${cursor.date},id.lt.${cursor.id})`
    )
  }

  if (accountIds && accountIds.length > 0) {
    query = query.in('account_id', accountIds)
  }

  if (category) {
    query = query.or(
      `category_manual.eq.${category},and(category_manual.is.null,category.eq.${category})`
    )
  }

  const raw = unwrap(await query, { op: 'list' }) ?? []
  const hasMore = raw.length > limit
  const rows = hasMore ? raw.slice(0, limit) : raw
  const last = rows[rows.length - 1]

  return {
    items: rows.map(narrowUnions) as TransactionWithAccount[],
    nextCursor: hasMore && last ? { date: last.date, id: last.id } : null,
  }
}

/**
 * No leídos anteriores a la ventana (issue #225): el badge cuenta todos los no
 * leídos sin filtro de fecha, así que la lista debe poder mostrarlos (y marcarlos)
 * aunque queden fuera de la ventana; si no, el badge queda >0 sin forma de
 * vaciarlo. `.lt` no solapa con la query de ventana (`.gte`) y la consulta se
 * apoya en el índice parcial de no leídos (#149).
 */
export async function listUnreadBeforeWindow(
  supabase: Db,
  householdId: string,
  now?: Date
): Promise<TransactionWithAccount[]> {
  const rows = unwrap(
    await supabase
      .from('transactions')
      .select(TX_SELECT)
      .eq('household_id', householdId)
      .eq('is_read', false)
      .lt('date', getWindowCutoff(now))
      .order('date', { ascending: false })
      .order('id', { ascending: false }),
    { op: 'list-unread' }
  )

  return (rows ?? []).map(narrowUnions) as TransactionWithAccount[]
}

/**
 * Conteo de no leídos para el badge de la tabBar (#149), sin filtro de fecha.
 * `head: true` evita traer filas: sólo el conteo, apoyado en el índice parcial.
 */
export async function getUnreadCount(supabase: Db, householdId: string): Promise<number> {
  const res = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('household_id', householdId)
    .eq('is_read', false)

  unwrap(res, { op: 'count-unread' })
  return res.count ?? 0
}
