'use client'

import { useMemo, useState } from 'react'
import { CATEGORY_META } from '@/lib/theme'
import type { CategoryId, TransactionWithAccount } from '@/types'

export type TypeFilter = 'todos' | 'ingresos' | 'gastos' | 'no-computable'

export const TYPE_PILLS: { key: TypeFilter; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'ingresos', label: 'Ingresos' },
  { key: 'gastos', label: 'Gastos' },
  { key: 'no-computable', label: 'No Computable' },
]

export function useMovimientosFilters(transactions: TransactionWithAccount[]) {
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('todos')
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([])

  const filtered = useMemo(() => {
    let result = transactions

    if (selectedAccountIds.length > 0) {
      result = result.filter(tx => selectedAccountIds.includes(tx.account_id))
    }

    if (typeFilter !== 'todos') {
      result = result.filter(tx => {
        const catId = (tx.category_manual ?? tx.category) as CategoryId | null
        if (catId === null) return false
        const catType = CATEGORY_META[catId]?.type
        if (typeFilter === 'ingresos')      return catType === 'income'
        if (typeFilter === 'gastos')        return catType === 'expense'
        if (typeFilter === 'no-computable') return catType === 'non_computable'
        return true
      })
    }

    const q = searchQuery.trim().toLowerCase()
    if (q) {
      result = result.filter(tx => {
        if (tx.description.toLowerCase().includes(q)) return true
        const cat = (tx.category_manual ?? tx.category ?? 'other') as CategoryId
        const label = CATEGORY_META[cat]?.label ?? ''
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
