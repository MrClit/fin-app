import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getHouseholdId } from '@/lib/household'
import { MovimientosClient } from '@/components/transactions/MovimientosClient'
import { MovimientosSkeleton } from '@/components/transactions/MovimientosSkeleton'
import { buildNextCursor } from '@/lib/pagination'
import type { TransactionWithAccount } from '@/types'

const INITIAL_PAGE_SIZE = 200

export default function MovimientosPage({
  searchParams,
}: {
  searchParams: Promise<{ cuenta?: string }>
}) {
  return (
    <Suspense fallback={<MovimientosSkeleton />}>
      <MovimientosContent searchParams={searchParams} />
    </Suspense>
  )
}

async function MovimientosContent({
  searchParams,
}: {
  searchParams: Promise<{ cuenta?: string }>
}) {
  const { cuenta } = await searchParams
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
      .select('id, name, color, number')
      .eq('is_active', true)
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
    cuenta && accountsList.some(a => a.id === cuenta) ? [cuenta] : []

  const initialTransactions = (transactions ?? []) as TransactionWithAccount[]
  const initialCursor = buildNextCursor(initialTransactions, INITIAL_PAGE_SIZE)

  return (
    <MovimientosClient
      initialTransactions={initialTransactions}
      initialCursor={initialCursor}
      accounts={accountsList}
      manualAccountId={manualAccountId ?? ''}
      initialAccountIds={initialAccountIds}
    />
  )
}
