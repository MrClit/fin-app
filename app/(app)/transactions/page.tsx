import { Suspense } from 'react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser, getCurrentHouseholdId, getRequestClient } from '@/lib/auth/session'
import { TransactionsClient } from '@/components/transactions/TransactionsClient'
import { TransactionsSkeleton } from '@/components/transactions/TransactionsSkeleton'
import { buildNextCursor } from '@/lib/pagination'
import { narrowUnions } from '@/lib/supabase/rows'

export const metadata: Metadata = { title: 'Movimientos' }

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
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const householdId = await getCurrentHouseholdId()
  if (!householdId) redirect('/login')

  const supabase = await getRequestClient()

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 90)
  const cutoffStr = cutoff.toISOString().slice(0, 10)

  const [{ data: transactions }, { data: oldUnread }, { data: accounts }, { data: manualAcc }] = await Promise.all([
    supabase
      .from('transactions')
      .select('*, account:accounts(id, name, color)')
      .gte('date', cutoffStr)
      .order('date', { ascending: false })
      .order('id', { ascending: false })
      .limit(INITIAL_PAGE_SIZE),
    // No leídos anteriores a la ventana de 90 días (issue #225): el badge cuenta
    // todos los no leídos sin filtro de fecha, así que la lista debe poder
    // mostrarlos (y marcarlos) aunque queden fuera de la ventana; si no, el badge
    // queda >0 sin forma de vaciarlo. `.lt` no solapa con la query de ventana
    // (`.gte`) y la consulta se apoya en el índice parcial de no leídos (#149).
    supabase
      .from('transactions')
      .select('*, account:accounts(id, name, color)')
      .eq('is_read', false)
      .lt('date', cutoffStr)
      .order('date', { ascending: false })
      .order('id', { ascending: false }),
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

  const accountsList = (accounts ?? []).map(narrowUnions)
  const initialAccountIds =
    account && accountsList.some(a => a.id === account) ? [account] : []

  // El cursor de paginación se calcula solo sobre la ventana de 90 días; los no
  // leídos antiguos van anexados al final (todos son < cutoff, el orden global
  // fecha-desc se conserva) y `appendTxs` deduplica por id si la paginación
  // llega a alcanzarlos.
  const windowTransactions = (transactions ?? []).map(narrowUnions)
  const initialCursor = buildNextCursor(windowTransactions, INITIAL_PAGE_SIZE)
  const initialTransactions = [...windowTransactions, ...(oldUnread ?? []).map(narrowUnions)]

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
