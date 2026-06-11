import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getHouseholdId } from '@/lib/household'
import { TransactionsClient } from '@/components/transactions/TransactionsClient'
import { TransactionsSkeleton } from '@/components/transactions/TransactionsSkeleton'
import { buildNextCursor } from '@/lib/pagination'
import type { TransactionWithAccount } from '@/types'

const INITIAL_PAGE_SIZE = 200

export default function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ account?: string }>
}) {
  return (
    <Suspense fallback={<TransactionsSkeleton />}>
      <TransactionsContent searchParams={searchParams} />
    </Suspense>
  )
}

async function TransactionsContent({
  searchParams,
}: {
  searchParams: Promise<{ account?: string }>
}) {
  const { account } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const householdId = await getHouseholdId(supabase, user.id)
  if (!householdId) redirect('/login')

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 90)
  const cutoffStr = cutoff.toISOString().slice(0, 10)

  const [{ data: transactions }, { data: accounts }, { data: manualAcc }] = await Promise.all([
    supabase
      .from('transactions')
      .select('*, account:accounts(id, name, color)')
      .gte('date', cutoffStr)
      .order('date', { ascending: false })
      .order('id', { ascending: false })
      .limit(INITIAL_PAGE_SIZE),
    supabase
      .from('accounts')
      .select('id, name, color, number, type')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase
      .from('accounts')
      .select('id')
      .eq('household_id', householdId)
      .eq('source', 'manual')
      .order('created_at', { ascending: true })
      .limit(1),
  ])

  // manualAcc es un array (limit(1)), tomar el primero
  let manualAccountId = (manualAcc as { id: string }[] | null)?.[0]?.id
  if (!manualAccountId) {
    const { data: created } = await supabase
      .from('accounts')
      .insert({ user_id: user.id, household_id: householdId, name: 'Manual', type: 'cash', source: 'manual', color: '#64748b' })
      .select('id')
      .single()
    manualAccountId = created?.id
  }

  const accountsList = accounts ?? []
  const initialAccountIds =
    account && accountsList.some(a => a.id === account) ? [account] : []

  const initialTransactions = (transactions ?? []) as TransactionWithAccount[]
  const initialCursor = buildNextCursor(initialTransactions, INITIAL_PAGE_SIZE)

  return (
    <TransactionsClient
      initialTransactions={initialTransactions}
      initialCursor={initialCursor}
      accounts={accountsList}
      manualAccountId={manualAccountId ?? ''}
      initialAccountIds={initialAccountIds}
    />
  )
}
