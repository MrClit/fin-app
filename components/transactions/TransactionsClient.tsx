'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { SwipeSide } from '@/hooks/useHorizontalSwipe'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import type { TxRowPhase } from './TxRow'
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

// Debe coincidir con la duración de `.animate-row-in` y la transición de colapso
// de `TxRow` (#220), en ms.
const REORG_ANIM_MS = 200

interface TransactionsClientProps {
  initialTransactions: TransactionWithAccount[]
  initialCursor: TransactionCursor | null
  accounts: Pick<Account, 'id' | 'name' | 'color' | 'number' | 'type'>[]
  manualAccountId: string
  initialAccountIds?: string[]
}

export function TransactionsClient({ initialTransactions, initialCursor, accounts, manualAccountId, initialAccountIds }: TransactionsClientProps) {
  const { transactions, addTx, appendTxs, deleteTx, recategorize, markRead, markUnread } = useTxMutations(initialTransactions)
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
  const [swiped, setSwiped] = useState<{ id: string; side: SwipeSide } | null>(null)
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null)
  const [catPickerTx, setCatPickerTx] = useState<TransactionWithAccount | null>(null)

  // Animación de reorganización de «No leídos» (#220). Confirmación en dos fases:
  // la fila colapsa en su sitio (`leavingIds`) antes de cambiar `is_read`, y al
  // recolocarse entra expandiéndose (`enteringIds`). Con reduced-motion se omite.
  const reducedMotion = useReducedMotion()
  const [leavingIds, setLeavingIds] = useState<Set<string>>(() => new Set())
  const [enteringIds, setEnteringIds] = useState<Set<string>>(() => new Set())
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])
  useEffect(() => () => { timeoutsRef.current.forEach(clearTimeout) }, [])

  const phaseOf = useCallback(
    (id: string): TxRowPhase =>
      leavingIds.has(id) ? 'leaving' : enteringIds.has(id) ? 'entering' : 'idle',
    [leavingIds, enteringIds]
  )

  const selectedTx = selectedTxId ? transactions.find(t => t.id === selectedTxId) ?? null : null

  // Partición de la vista filtrada: arriba los «No leídos» (lista plana por fecha
  // desc) y debajo el resto agrupado por día. La membresía es VIVA: depende de
  // `is_read` en cada render, así que marcar leído/no leído reorganiza la fila al
  // instante (baja a su día o sube a la sección) y el contador del encabezado
  // refleja siempre los no leídos reales de la vista cargada.
  const pinnedUnread = useMemo(
    () => filters.filtered.filter(t => !t.is_read),
    [filters.filtered]
  )
  const groups = useMemo(
    () => groupTxByDate(filters.filtered.filter(t => t.is_read)),
    [filters.filtered]
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
    const apply = () => {
      if (tx.is_read) void markUnread(tx.id)
      else void markRead(tx.id)
    }
    // Con reduced-motion (o sin animación) se cambia el estado al instante.
    if (reducedMotion) {
      apply()
      return
    }
    const id = tx.id
    // Fase 1: colapsar la fila en su posición actual sin tocar `is_read`.
    setLeavingIds(prev => new Set(prev).add(id))
    const tLeave = setTimeout(() => {
      // Fase 2: commit del cambio (la fila se recoloca) + entrada animada.
      setLeavingIds(prev => { const next = new Set(prev); next.delete(id); return next })
      apply()
      setEnteringIds(prev => new Set(prev).add(id))
      const tEnter = setTimeout(() => {
        setEnteringIds(prev => { const next = new Set(prev); next.delete(id); return next })
      }, REORG_ANIM_MS)
      timeoutsRef.current.push(tEnter)
    }, REORG_ANIM_MS)
    timeoutsRef.current.push(tLeave)
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
        phaseOf={phaseOf}
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
