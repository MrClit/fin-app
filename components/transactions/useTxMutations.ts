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

  // El callback de Reintentar del toast re-ejecuta la propia operación. Se usa
  // una función con nombre (`attempt`) para poder referenciarla recursivamente
  // sin acceder a la variable del useCallback antes de declararla.
  const deleteTx = useCallback((id: string) => {
    return (async function attempt() {
      setTransactions(prev => prev.filter(t => t.id !== id))
      try {
        const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error(await res.text())
      } catch (err) {
        setTransactions(initial)
        console.error('[useTxMutations.deleteTx] Error eliminando:', err)
        showToast('No se pudo eliminar el movimiento', () => { void attempt() })
      }
    })()
  }, [initial, showToast])

  const recategorize = useCallback((id: string, category: CategoryId) => {
    return (async function attempt() {
      setTransactions(prev => prev.map(t =>
        t.id === id ? { ...t, category_manual: category } : t
      ))
      try {
        const res = await fetch(`/api/transactions/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category_manual: category }),
        })
        if (!res.ok) throw new Error(await res.text())
      } catch (err) {
        setTransactions(initial)
        console.error('[useTxMutations.recategorize] Error recategorizando:', err)
        showToast('No se pudo recategorizar el movimiento', () => { void attempt() })
      }
    })()
  }, [initial, showToast])

  return { transactions, addTx, deleteTx, recategorize }
}
