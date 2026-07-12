import { Suspense } from 'react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser, getCurrentHouseholdId, getRequestClient } from '@/lib/auth/session'
import { TransactionsClient } from '@/components/transactions/TransactionsClient'
import { TransactionsSkeleton } from '@/components/transactions/TransactionsSkeleton'
import { listTransactions, listUnreadBeforeWindow } from '@/lib/transactions'
import { getActiveAccounts, getManualAccountId } from '@/lib/accounts'

export const metadata: Metadata = { title: 'Movimientos' }

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

  const [window, oldUnread, accounts, manualAccountId] = await Promise.all([
    listTransactions(supabase, householdId),
    listUnreadBeforeWindow(supabase, householdId),
    getActiveAccounts(supabase, householdId),
    getManualAccountId(supabase, householdId),
  ])

  const initialAccountIds =
    account && accounts.some(a => a.id === account) ? [account] : []

  // El cursor de paginación se calcula solo sobre la ventana; los no leídos
  // antiguos van anexados al final (todos son < cutoff, el orden global
  // fecha-desc se conserva) y `appendTxs` deduplica por id si la paginación
  // llega a alcanzarlos.
  const initialTransactions = [...window.items, ...oldUnread]

  return (
    <TransactionsClient
      initialTransactions={initialTransactions}
      initialCursor={window.nextCursor}
      accounts={accounts}
      manualAccountId={manualAccountId ?? ''}
      initialAccountIds={initialAccountIds}
    />
  )
}
