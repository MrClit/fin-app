'use client'

import { useEffect, useMemo, useState } from 'react'
import { TxModal } from './TxModal'
import { AccountFilter } from './AccountFilter'
import { CategoryPicker } from './CategoryPicker'
import { AddTxModal } from './AddTxModal'
import { TransactionsToolbar } from './TransactionsToolbar'
import { TransactionsList } from './TransactionsList'
import { AddTxFab } from './AddTxFab'
import { useTransactionsFilters } from './useTransactionsFilters'
import { useTxMutations } from './useTxMutations'
import { useTxPagination } from './useTxPagination'
import { groupTxByDate } from '@/lib/transactions'
import type { TransactionCursor } from '@/lib/pagination'
import type { Account, TransactionWithAccount } from '@/types'

interface TransactionsClientProps {
  initialTransactions: TransactionWithAccount[]
  initialCursor: TransactionCursor | null
  accounts: Pick<Account, 'id' | 'name' | 'color' | 'number'>[]
  manualAccountId: string
  initialAccountIds?: string[]
}

export function TransactionsClient({ initialTransactions, initialCursor, accounts, manualAccountId, initialAccountIds }: TransactionsClientProps) {
  const { transactions, addTx, appendTxs, deleteTx, recategorize } = useTxMutations(initialTransactions)
  const pagination = useTxPagination({ initialCursor, appendTxs })
  const filters = useTransactionsFilters(transactions, initialAccountIds)

  // `?account=` solo actúa como deep-link de entrada: lo consumimos en el server
  // para inicializar el filtro y aquí limpiamos la URL para evitar que mienta
  // cuando el usuario cambia el filtro desde el selector. `replaceState` no
  // dispara navegación de Next, solo reescribe la URL del browser.
  useEffect(() => {
    if (initialAccountIds && initialAccountIds.length > 0) {
      window.history.replaceState(null, '', '/transactions')
    }
  }, [initialAccountIds])

  const [showAccountFilter, setShowAccountFilter] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [swipedTxId, setSwipedTxId] = useState<string | null>(null)
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null)
  const [catPickerTx, setCatPickerTx] = useState<TransactionWithAccount | null>(null)

  const selectedTx = selectedTxId ? transactions.find(t => t.id === selectedTxId) ?? null : null
  const groups = useMemo(() => groupTxByDate(filters.filtered), [filters.filtered])

  function handleTxTap(tx: TransactionWithAccount) {
    setSelectedTxId(tx.id)
    setSwipedTxId(null)
  }

  function handleRecategorize(tx: TransactionWithAccount) {
    setCatPickerTx(tx)
    setSwipedTxId(null)
  }

  async function handleDelete(txId: string) {
    setSelectedTxId(null)
    await deleteTx(txId)
  }

  return (
    <div className="px-4 pt-3 pb-6 flex flex-col gap-4">
      <h1 className="text-xl font-bold text-foreground">Movimientos</h1>

      <TransactionsToolbar
        searchQuery={filters.searchQuery}
        onSearchChange={filters.setSearchQuery}
        typeFilter={filters.typeFilter}
        onTypeFilterChange={filters.setTypeFilter}
        selectedAccountIds={filters.selectedAccountIds}
        accounts={accounts}
        onOpenAccountFilter={() => setShowAccountFilter(true)}
      />

      <TransactionsList
        groups={groups}
        swipedTxId={swipedTxId}
        onSwipe={setSwipedTxId}
        onRecategorize={handleRecategorize}
        onTap={handleTxTap}
        onLoadMore={pagination.loadMore}
        hasMore={pagination.hasMore}
        loadingMore={pagination.loading}
        loadMoreError={pagination.error}
      />

      <AccountFilter
        open={showAccountFilter}
        onOpenChange={setShowAccountFilter}
        accounts={accounts}
        selectedIds={filters.selectedAccountIds}
        onSelectionChange={filters.setSelectedAccountIds}
      />

      <TxModal
        tx={selectedTx}
        open={!!selectedTx}
        onOpenChange={o => { if (!o) setSelectedTxId(null) }}
        onRecategorize={handleRecategorize}
        onDelete={handleDelete}
      />

      <CategoryPicker
        tx={catPickerTx}
        open={!!catPickerTx}
        onOpenChange={o => { if (!o) setCatPickerTx(null) }}
        onSelect={recategorize}
      />

      <AddTxModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        manualAccountId={manualAccountId}
        onSave={addTx}
      />

      <AddTxFab onClick={() => setShowAddModal(true)} />
    </div>
  )
}
