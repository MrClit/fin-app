import { getCurrentUser, getCurrentHouseholdId, getRequestClient } from '@/lib/auth/session'
import { monthLabel } from '@/lib/dates'
import { narrowUnions } from '@/lib/supabase/rows'
import type { Account } from '@/types'

export interface DashboardData {
  balance: number
  weeklyDelta: number
  dailyBalances: number[]
  accounts: Account[]
  netWorthData: { label: string; value: number }[]
  annualDelta: number | null
}

/**
 * Serie de saldos diarios (más antiguo → más reciente), reconstruida hacia atrás
 * desde el saldo actual: el saldo de un día es el del día siguiente menos lo que
 * se movió en ese día siguiente.
 *
 * Itera sobre la copia invertida en vez de por índice (`days[i + 1]`), que es lo
 * que obligaba a asumir accesos definidos que TS no puede probar (#270).
 */
export function buildDailyBalances(
  balance: number,
  days: readonly string[],
  txByDay: Record<string, number>
): number[] {
  const newestFirst: number[] = []
  let running = balance
  for (const day of [...days].reverse()) {
    newestFirst.push(running)
    running -= txByDay[day] ?? 0
  }
  return newestFirst.reverse()
}

/**
 * Variación de los últimos 7 días.
 *
 * Equivale al `balance − saldo de hace 7 días` de la serie diaria, pero
 * expresado como lo que realmente es: la suma de lo movido en ese tramo.
 */
export function weeklyDeltaFrom(
  days: readonly string[],
  txByDay: Record<string, number>
): number {
  return days.slice(-7).reduce((sum, day) => sum + (txByDay[day] ?? 0), 0)
}

/**
 * Serie mensual de patrimonio neto (más antiguo → más reciente) y variación
 * anual, reconstruidas hacia atrás desde el saldo actual con el mismo criterio
 * que `buildDailyBalances`.
 *
 * `annualDelta` sólo tiene sentido con los 12 meses completos; si la ventana
 * activa es más corta, es `null`.
 */
export function buildNetWorthSeries(
  balance: number,
  activeMonths: readonly string[],
  txByMonth: Record<string, number>
): { netWorthData: { label: string; value: number }[]; annualDelta: number | null } {
  const newestFirst: { label: string; value: number }[] = []
  let running = balance
  // El último valor visitado es el del mes más antiguo: el que fija annualDelta.
  let oldestValue = balance

  for (const month of [...activeMonths].reverse()) {
    oldestValue = running
    // `month` es 'YYYY-MM': el mes ocupa siempre las posiciones 5-6.
    newestFirst.push({ label: monthLabel(Number(month.slice(5, 7)) - 1), value: Math.round(running) })
    running -= txByMonth[month] ?? 0
  }

  return {
    netWorthData: newestFirst.reverse(),
    annualDelta: activeMonths.length === 12 ? Math.round(balance - oldestValue) : null,
  }
}

// Patrimonio neto = activos − |Σ pasivos|. Ver spec §5.5.
export function calculateNetWorth(
  accounts: Pick<Account, 'is_liability' | 'balance'>[]
): number {
  const assets = accounts.filter(a => !a.is_liability).reduce((s, a) => s + (a.balance ?? 0), 0)
  const liabs  = accounts.filter(a =>  a.is_liability).reduce((s, a) => s + (a.balance ?? 0), 0)
  return assets - Math.abs(liabs)
}

export async function getDashboardData(): Promise<DashboardData> {
  const user = await getCurrentUser()
  if (!user) throw new Error('Unauthorized')

  const householdId = await getCurrentHouseholdId()
  if (!householdId) throw new Error('Unauthorized')

  const supabase = await getRequestClient()

  const { data: accounts, error: accError } = await supabase
    .from('accounts')
    .select('*')
    .eq('household_id', householdId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (accError || !accounts) throw new Error('Failed to fetch accounts')

  const balance = calculateNetWorth(accounts)

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)
  thirtyDaysAgo.setHours(0, 0, 0, 0)

  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select('date, amount')
    .eq('household_id', householdId)
    .gte('date', thirtyDaysAgo.toISOString())

  if (txError) throw new Error('Failed to fetch transactions')

  // Build 30-day array of dates (oldest → newest)
  const today = new Date()
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (29 - i))
    return d.toISOString().slice(0, 10)
  })

  // Aggregate transaction amounts by calendar day
  const txByDay: Record<string, number> = {}
  for (const tx of transactions ?? []) {
    const day = tx.date.slice(0, 10)
    txByDay[day] = (txByDay[day] ?? 0) + tx.amount
  }

  const dailyBalances = buildDailyBalances(balance, days, txByDay)
  const weeklyDelta = weeklyDeltaFrom(days, txByDay)

  // ── Patrimonio neto mensual (últimos 12 meses) ────────────────────────────
  const twelveMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 11, 1)

  const { data: monthlyTxData } = await supabase
    .from('transactions')
    .select('date, amount')
    .eq('household_id', householdId)
    .gte('date', twelveMonthsAgo.toISOString().slice(0, 10))

  const txByMonth: Record<string, number> = {}
  for (const tx of monthlyTxData ?? []) {
    const key = tx.date.substring(0, 7)
    txByMonth[key] = (txByMonth[key] ?? 0) + tx.amount
  }

  const allMonths = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - (11 - i), 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })

  const firstIdx = allMonths.findIndex(m => txByMonth[m] !== undefined)
  // `slice(-1)` en vez de `[allMonths[allMonths.length - 1]]`: mismo último mes,
  // pero sin acceso por índice.
  const activeMonths = firstIdx === -1 ? allMonths.slice(-1) : allMonths.slice(firstIdx)

  const { netWorthData, annualDelta } = buildNetWorthSeries(balance, activeMonths, txByMonth)

  return { balance, weeklyDelta, dailyBalances, accounts: accounts.map(narrowUnions), netWorthData, annualDelta }
}
