import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MovimientosClient } from '@/components/transactions/MovimientosClient'
import type { TransactionWithAccount } from '@/types'

export default async function MovimientosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 90)
  const cutoffStr = cutoff.toISOString().slice(0, 10)

  const [{ data: transactions }, { data: accounts }] = await Promise.all([
    supabase
      .from('transactions')
      .select('*, account:accounts(id, name, color)')
      .eq('is_internal_transfer', false)
      .gte('date', cutoffStr)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(200),
    supabase
      .from('accounts')
      .select('id, name, color, number')
      .eq('is_active', true)
      .order('created_at', { ascending: true }),
  ])

  return (
    <MovimientosClient
      initialTransactions={(transactions ?? []) as TransactionWithAccount[]}
      accounts={accounts ?? []}
    />
  )
}
