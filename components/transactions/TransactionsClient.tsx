'use client'

import { useEffect, useMemo, useState } from 'react'
import type { SwipeSide } from '@/hooks/useHorizontalSwipe'
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
  const { transactions, addTx, appendTxs, deleteTx, recategorize, markRead, markUnread } = useTxMutations(initialTransactions)
  const pagination = useTxPagination({ initialCursor, appendTxs })
  const filters = useTransactionsFilters(transactions, initialAccountIds)

  // Membresía CONGELADA de la sección «No leídos»: un movimiento entra en la
  // sección si era no leído la primera vez que apareció en la lista (snapshot
  // inicial o página paginada), y permanece aunque luego se marque leído. Así el
  // dot se apaga al instante pero la fila no salta. Al volver/recargar el
  // componente se remonta y la membresía se recalcula desde datos frescos.
  //
  // Se modela con estado (no refs) y se actualiza durante el render —patrón
  // recomendado por React— al detectar ids nuevos respecto a los ya vistos.
  const [seenIds, setSeenIds] = useState<Set<string>>(
    () => new Set(initialTransactions.map(t => t.id))
  )
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(
    () => new Set(initialTransactions.filter(t => !t.is_read).map(t => t.id))
  )
  const freshIds = transactions.filter(t => !seenIds.has(t.id))
  if (freshIds.length > 0) {
    setSeenIds(prev => new Set([...prev, ...freshIds.map(t => t.id)]))
    setPinnedIds(prev => new Set([...prev, ...freshIds.filter(t => !t.is_read).map(t => t.id)]))
  }

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
  const [swiped, setSwiped] = useState<{ id: string; side: SwipeSide } | null>(null)
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null)
  const [catPickerTx, setCatPickerTx] = useState<TransactionWithAccount | null>(null)

  const selectedTx = selectedTxId ? transactions.find(t => t.id === selectedTxId) ?? null : null

  // Partición de la vista filtrada: arriba los «No leídos» (membresía congelada,
  // lista plana por fecha desc) y debajo el resto agrupado por día como siempre.
  const pinnedUnread = useMemo(
    () => filters.filtered.filter(t => pinnedIds.has(t.id)),
    [filters.filtered, pinnedIds]
  )
  const groups = useMemo(
    () => groupTxByDate(filters.filtered.filter(t => !pinnedIds.has(t.id))),
    [filters.filtered, pinnedIds]
  )

  function handleTxTap(tx: TransactionWithAccount) {
    setSelectedTxId(tx.id)
    setSwiped(null)
    // Abrir el detalle marca leído aunque no se edite nada (issue #149).
    if (!tx.is_read) void markRead(tx.id)
  }

  function handleRecategorize(tx: TransactionWithAccount) {
    setCatPickerTx(tx)
    setSwiped(null)
  }

  function handleToggleRead(tx: TransactionWithAccount) {
    setSwiped(null)
    if (tx.is_read) void markUnread(tx.id)
    else void markRead(tx.id)
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
        pinnedUnread={pinnedUnread}
        swiped={swiped}
        onOpenSwipe={(id, side) => setSwiped({ id, side })}
        onCloseSwipe={() => setSwiped(null)}
        onRecategorize={handleRecategorize}
        onToggleRead={handleToggleRead}
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
