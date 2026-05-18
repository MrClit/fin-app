'use client'

import { useMemo, useState } from 'react'
import { TxModal } from './TxModal'
import { AccountFilter } from './AccountFilter'
import { CategoryPicker } from './CategoryPicker'
import { AddTxModal } from './AddTxModal'
import { MovimientosToolbar } from './MovimientosToolbar'
import { MovimientosList } from './MovimientosList'
import { AddTxFab } from './AddTxFab'
import { useMovimientosFilters } from './useMovimientosFilters'
import { useTxMutations } from './useTxMutations'
import { groupTxByDate } from '@/lib/transactions'
import type { Account, TransactionWithAccount } from '@/types'

interface MovimientosClientProps {
  initialTransactions: TransactionWithAccount[]
  accounts: Pick<Account, 'id' | 'name' | 'color' | 'number'>[]
  manualAccountId: string
}

export function MovimientosClient({ initialTransactions, accounts, manualAccountId }: MovimientosClientProps) {
  const { transactions, addTx, deleteTx, recategorize } = useTxMutations(initialTransactions)
  const filters = useMovimientosFilters(transactions)

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
    <div className="px-5 pt-3 pb-6 flex flex-col gap-4">
      <h1 className="text-xl font-bold text-foreground">Movimientos</h1>

      <MovimientosToolbar
        searchQuery={filters.searchQuery}
        onSearchChange={filters.setSearchQuery}
        typeFilter={filters.typeFilter}
        onTypeFilterChange={filters.setTypeFilter}
        selectedAccountIds={filters.selectedAccountIds}
        accounts={accounts}
        onOpenAccountFilter={() => setShowAccountFilter(true)}
      />

      <MovimientosList
        groups={groups}
        swipedTxId={swipedTxId}
        onSwipe={setSwipedTxId}
        onRecategorize={handleRecategorize}
        onTap={handleTxTap}
      />

      <AccountFilter
        open={showAccountFilter}
        onOpenChange={setShowAccountFilter}
        accounts={accounts}
        selectedIds={filters.selectedAccountIds}
        onSelectionChange={filters.setSelectedAccountIds}
      />

      {selectedTx && (
        <TxModal
          tx={selectedTx}
          open
          onOpenChange={o => { if (!o) setSelectedTxId(null) }}
          onRecategorize={handleRecategorize}
          onDelete={handleDelete}
        />
      )}

      {catPickerTx && (
        <CategoryPicker
          tx={catPickerTx}
          open
          onOpenChange={o => { if (!o) setCatPickerTx(null) }}
          onSelect={recategorize}
        />
      )}

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
