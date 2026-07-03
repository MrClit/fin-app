'use client'

import { useMemo, useState } from 'react'
import { CATEGORY_META } from '@/lib/theme'
import { getEffectiveCategory } from '@/lib/categories'
import type { TransactionWithAccount } from '@/types'

export type TypeFilter = 'all' | 'income' | 'expense' | 'non-computable'

export const TYPE_PILLS: { key: TypeFilter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'income', label: 'Ingresos' },
  { key: 'expense', label: 'Gastos' },
  { key: 'non-computable', label: 'No Computable' },
]

export function useTransactionsFilters(
  transactions: TransactionWithAccount[],
  initialAccountIds: string[] = []
) {
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>(initialAccountIds)

  const filtered = useMemo(() => {
    let result = transactions

    if (selectedAccountIds.length > 0) {
      result = result.filter(tx => selectedAccountIds.includes(tx.account_id))
    }

    if (typeFilter !== 'all') {
      result = result.filter(tx => {
        const catId = getEffectiveCategory(tx)
        if (catId === null) return false
        const catType = CATEGORY_META[catId]?.type
        if (typeFilter === 'income')      return catType === 'income'
        if (typeFilter === 'expense')        return catType === 'expense'
        if (typeFilter === 'non-computable') return catType === 'non_computable'
        return true
      })
    }

    const q = searchQuery.trim().toLowerCase()
    if (q) {
      result = result.filter(tx => {
        if (tx.description.toLowerCase().includes(q)) return true
        const cat = getEffectiveCategory(tx) ?? 'other'
        const label = CATEGORY_META[cat].label
        return label.toLowerCase().includes(q)
      })
    }

    return result
  }, [transactions, searchQuery, typeFilter, selectedAccountIds])

  return {
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    selectedAccountIds,
    setSelectedAccountIds,
    filtered,
  }
}
