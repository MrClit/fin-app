'use client'

import { useCallback, useState } from 'react'
import { useSyncStatus } from '@/components/sync/SyncStatusProvider'
import type { CategoryId, TransactionWithAccount } from '@/types'

export function useTxMutations(initial: TransactionWithAccount[]) {
  const [transactions, setTransactions] = useState(initial)
  const { showToast } = useSyncStatus()

  const addTx = useCallback((tx: TransactionWithAccount) => {
    setTransactions(prev => [tx, ...prev])
  }, [])

  // Anexa una página paginada al final de la lista, dedup por id para
  // protegerse de carreras (p.ej. tx nueva que entra por la cabecera y
  // también aparece en la siguiente página). Mantiene el orden de llegada
  // para items nuevos; los duplicados se ignoran.
  const appendTxs = useCallback((items: TransactionWithAccount[]) => {
    if (items.length === 0) return
    setTransactions(prev => {
      const known = new Set(prev.map(t => t.id))
      const fresh = items.filter(t => !known.has(t.id))
      if (fresh.length === 0) return prev
      return [...prev, ...fresh]
    })
  }, [])

  // El callback de Reintentar del toast re-ejecuta la propia operación. Se usa
  // una función con nombre (`attempt`) para poder referenciarla recursivamente
  // sin acceder a la variable del useCallback antes de declararla.
  // Snapshot capturado antes de mutar para que el rollback no descarte items
  // ya paginados ni mutaciones concurrentes.
  const deleteTx = useCallback((id: string) => {
    return (async function attempt() {
      let snapshot: TransactionWithAccount[] = []
      setTransactions(prev => {
        snapshot = prev
        return prev.filter(t => t.id !== id)
      })
      try {
        const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error(await res.text())
      } catch (err) {
        setTransactions(snapshot)
        console.error('[useTxMutations.deleteTx] Error eliminando:', err)
        showToast('No se pudo eliminar el movimiento', () => { void attempt() })
      }
    })()
  }, [showToast])

  const recategorize = useCallback((id: string, category: CategoryId) => {
    return (async function attempt() {
      let snapshot: TransactionWithAccount[] = []
      setTransactions(prev => {
        snapshot = prev
        return prev.map(t =>
          t.id === id ? { ...t, category_manual: category } : t
        )
      })
      try {
        const res = await fetch(`/api/transactions/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category_manual: category }),
        })
        if (!res.ok) throw new Error(await res.text())
      } catch (err) {
        setTransactions(snapshot)
        console.error('[useTxMutations.recategorize] Error recategorizando:', err)
        showToast('No se pudo recategorizar el movimiento', () => { void attempt() })
      }
    })()
  }, [showToast])

  return { transactions, addTx, appendTxs, deleteTx, recategorize }
}
