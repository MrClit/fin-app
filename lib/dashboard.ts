import { createClient } from '@/lib/supabase/server'
import type { Account } from '@/types'

export interface DashboardData {
  balance: number
  weeklyDelta: number
  dailyBalances: number[]
  accounts: Account[]
  patrimonioData: { label: string; value: number }[]
  annualDelta: number | null
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
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Unauthorized')

  const { data: accounts, error: accError } = await supabase
    .from('accounts')
    .select('id, name, type, is_liability, balance, number, color, currency, source, last_synced, consent_expires_at, created_at, user_id, external_id, session_id, is_active')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  if (accError || !accounts) throw new Error('Failed to fetch accounts')

  const balance = calculateNetWorth(accounts)

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)
  thirtyDaysAgo.setHours(0, 0, 0, 0)

  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select('date, amount')
    .eq('user_id', user.id)
    .gte('date', thirtyDaysAgo.toISOString())

  if (txError) throw new Error('Failed to fetch transactions')

  // Build 30-day array of dates (oldest → newest)
  const today = new Date()
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (29 - i))
    return d.toISOString().split('T')[0]
  })

  // Aggregate transaction amounts by calendar day
  const txByDay: Record<string, number> = {}
  for (const tx of transactions ?? []) {
    const day = tx.date.split('T')[0]
    txByDay[day] = (txByDay[day] ?? 0) + tx.amount
  }

  // Reconstruct historical net balance working backwards from today
  const dailyBalances: number[] = new Array(30)
  dailyBalances[29] = balance
  for (let i = 28; i >= 0; i--) {
    dailyBalances[i] = dailyBalances[i + 1] - (txByDay[days[i + 1]] ?? 0)
  }

  // Index 22 = 7 days ago (29 - 7 = 22)
  const weeklyDelta = balance - dailyBalances[22]

  // ── Patrimonio neto mensual (últimos 12 meses) ────────────────────────────
  const twelveMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 11, 1)

  const { data: monthlyTxData } = await supabase
    .from('transactions')
    .select('date, amount')
    .eq('user_id', user.id)
    .gte('date', twelveMonthsAgo.toISOString().split('T')[0])

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
  const activeMonths = firstIdx === -1
    ? [allMonths[allMonths.length - 1]]
    : allMonths.slice(firstIdx)

  const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  const values = new Array<number>(activeMonths.length)
  values[activeMonths.length - 1] = balance
  for (let i = activeMonths.length - 2; i >= 0; i--) {
    values[i] = values[i + 1] - (txByMonth[activeMonths[i + 1]] ?? 0)
  }

  const patrimonioData = activeMonths.map((m, i) => ({
    label: MONTH_LABELS[Number(m.split('-')[1]) - 1],
    value: Math.round(values[i]),
  }))

  const annualDelta = activeMonths.length === 12 ? Math.round(balance - values[0]) : null

  return { balance, weeklyDelta, dailyBalances, accounts: accounts as Account[], patrimonioData, annualDelta }
}
