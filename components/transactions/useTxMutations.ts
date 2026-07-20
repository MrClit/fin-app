'use client'

import { useCallback, useState } from 'react'
import { deleteTransaction, updateTransaction } from '@/app/actions/transactions'
import { useSyncStatus } from '@/components/sync/SyncStatusProvider'
import { useUnread } from '@/components/transactions/UnreadProvider'
import type { CategoryId, TransactionWithAccount } from '@/types'

export function useTxMutations(initial: TransactionWithAccount[]) {
  const [transactions, setTransactions] = useState(initial)
  const { showToast } = useSyncStatus()
  const { increment, decrement } = useUnread()

  const addTx = useCallback((tx: TransactionWithAccount) => {
    setTransactions(prev => [tx, ...prev])
  }, [])

  // Re-siembra la lista completa (p. ej. al cambiar de período en el detalle de
  // categoría). Si una mutación en vuelo falla después, su rollback restaura el
  // snapshot capturado al mutar, que puede ser el de la lista anterior: carrera
  // de milisegundos equivalente a la ya aceptada con la paginación.
  const replaceTxs = useCallback((items: TransactionWithAccount[]) => {
    setTransactions(items)
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
        const res = await deleteTransaction(id)
        if (res.error) {
          setTransactions(snapshot)
          console.error('[useTxMutations.deleteTx] Error eliminando:', res.error)
          // Sin Reintentar en los errores que un reintento no puede arreglar.
          if (res.error.code === 'imported_transaction') {
            showToast('No se pueden eliminar los movimientos importados')
          } else if (res.error.code === 'not_found') {
            showToast('No se pudo eliminar el movimiento')
          } else {
            showToast('No se pudo eliminar el movimiento', () => { void attempt() })
          }
        }
      } catch (err) {
        // Fallo de transporte (p. ej. offline): reintentable.
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
        const res = await updateTransaction(id, { category_manual: category })
        if (res.error) throw new Error(res.error.code)
      } catch (err) {
        setTransactions(snapshot)
        console.error('[useTxMutations.recategorize] Error recategorizando:', err)
        showToast('No se pudo recategorizar el movimiento', () => { void attempt() })
      }
    })()
  }, [showToast])

  // Marca leído/no leído de forma optimista, ajustando además el contador del badge
  // (UnreadProvider). El contador solo se toca si el estado realmente cambia, para
  // que un re-toggle redundante no lo descuadre. Rollback simétrico + toast.
  const setRead = useCallback((id: string, isRead: boolean) => {
    return (async function attempt() {
      // El estado real ya cambia: no reenviar ni descuadrar el contador. Se
      // comprueba contra `transactions` (estado actual en el closure), NO dentro
      // del updater de setState —que React no ejecuta de forma síncrona—.
      if (!transactions.some(t => t.id === id && t.is_read !== isRead)) return
      let snapshot: TransactionWithAccount[] = []
      setTransactions(prev => {
        snapshot = prev
        return prev.map(t => (t.id === id ? { ...t, is_read: isRead } : t))
      })
      // Leído → un no leído menos; no leído → uno más.
      if (isRead) decrement()
      else increment()
      try {
        const res = await updateTransaction(id, { is_read: isRead })
        if (res.error) throw new Error(res.error.code)
      } catch (err) {
        setTransactions(snapshot)
        if (isRead) increment()
        else decrement()
        console.error('[useTxMutations.setRead] Error marcando leído/no leído:', err)
        showToast('No se pudo actualizar el movimiento', () => { void attempt() })
      }
    })()
  }, [transactions, showToast, increment, decrement])

  const markRead = useCallback((id: string) => setRead(id, true), [setRead])
  const markUnread = useCallback((id: string) => setRead(id, false), [setRead])

  return { transactions, addTx, appendTxs, replaceTxs, deleteTx, recategorize, markRead, markUnread }
}
