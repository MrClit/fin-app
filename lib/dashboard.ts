import { createClient } from '@/lib/supabase/server'
import type { Account } from '@/types'

export interface DashboardData {
  balance: number
  weeklyDelta: number
  dailyBalances: number[]
  accounts: Account[]
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

  const assets = accounts.filter(a => !a.is_liability).reduce((s, a) => s + (a.balance ?? 0), 0)
  const liabs  = accounts.filter(a =>  a.is_liability).reduce((s, a) => s + (a.balance ?? 0), 0)
  const balance = assets - Math.abs(liabs)

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)
  thirtyDaysAgo.setHours(0, 0, 0, 0)

  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select('date, amount')
    .eq('user_id', user.id)
    .eq('is_computable', true)
    .eq('is_internal_transfer', false)
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

  return { balance, weeklyDelta, dailyBalances, accounts: accounts as Account[] }
}
