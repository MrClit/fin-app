'use client'

import { useCallback, useState } from 'react'
import type { CategoryId, TransactionWithAccount } from '@/types'

export function useTxMutations(initial: TransactionWithAccount[]) {
  const [transactions, setTransactions] = useState(initial)

  const addTx = useCallback((tx: TransactionWithAccount) => {
    setTransactions(prev => [tx, ...prev])
  }, [])

  const deleteTx = useCallback(async (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id))
    const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      setTransactions(initial)
      console.error('[useTxMutations.deleteTx] Error eliminando:', await res.text())
    }
  }, [initial])

  const recategorize = useCallback(async (id: string, category: CategoryId) => {
    setTransactions(prev => prev.map(t =>
      t.id === id ? { ...t, category_manual: category } : t
    ))
    const res = await fetch(`/api/transactions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category_manual: category }),
    })
    if (!res.ok) {
      setTransactions(initial)
      console.error('[useTxMutations.recategorize] Error recategorizando:', await res.text())
    }
  }, [initial])

  return { transactions, addTx, deleteTx, recategorize }
}
