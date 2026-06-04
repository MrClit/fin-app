'use client'

import { Search, X, ChevronDown, Box } from 'lucide-react'
import type { Account } from '@/types'
import { TYPE_PILLS, type TypeFilter } from './useTransactionsFilters'

interface TransactionsToolbarProps {
  searchQuery: string
  onSearchChange: (q: string) => void
  typeFilter: TypeFilter
  onTypeFilterChange: (t: TypeFilter) => void
  selectedAccountIds: string[]
  accounts: Pick<Account, 'id' | 'name' | 'color' | 'number'>[]
  onOpenAccountFilter: () => void
}

export function TransactionsToolbar({
  searchQuery,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  selectedAccountIds,
  accounts,
  onOpenAccountFilter,
}: TransactionsToolbarProps) {
  const accountLabel =
    selectedAccountIds.length === 0
      ? 'Todas las cuentas'
      : selectedAccountIds.length === 1
        ? (accounts.find(a => a.id === selectedAccountIds[0])?.name ?? '1 cuenta')
        : `${selectedAccountIds.length} cuentas`

  return (
    <>
      {/* Search */}
      <div
        className="flex items-center gap-2 px-3.5 py-2.5 rounded-[14px] bg-muted"
        style={{ border: '1px solid var(--border)' }}
      >
        <Search size={16} className="text-muted-foreground shrink-0" />
        <input
          type="text"
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          placeholder="Buscar por descripción o categoría…"
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
        />
        {searchQuery && (
          <button onClick={() => onSearchChange('')} className="text-muted-foreground hover:text-foreground shrink-0">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Account filter button — full width */}
      <button
        className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-[14px] transition-colors"
        style={{
          background: selectedAccountIds.length > 0 ? 'rgba(99,102,241,0.1)' : 'var(--muted)',
          border: selectedAccountIds.length > 0 ? '1px solid rgba(99,102,241,0.3)' : '1px solid var(--border)',
        }}
        onClick={onOpenAccountFilter}
      >
        <div className="flex items-center gap-2">
          <Box size={14} style={{ color: selectedAccountIds.length > 0 ? '#6366f1' : 'var(--muted-foreground)' }} strokeWidth={2} />
          <span
            className="text-sm font-semibold"
            style={{ color: selectedAccountIds.length > 0 ? '#6366f1' : 'var(--muted-foreground)' }}
          >
            {accountLabel}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {selectedAccountIds.length > 0 && (
            <span
              className="rounded-full text-[10px] font-bold px-1.5 py-0.5 leading-none"
              style={{ background: '#6366f1', color: 'white' }}
            >
              {selectedAccountIds.length}
            </span>
          )}
          <ChevronDown size={12} className="text-muted-foreground" />
        </div>
      </button>

      {/* Type pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
        {TYPE_PILLS.map(pill => (
          <button
            key={pill.key}
            className="px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors shrink-0"
            style={{
              background: typeFilter === pill.key ? '#6366f1' : 'var(--muted)',
              color: typeFilter === pill.key ? 'white' : 'var(--muted-foreground)',
            }}
            onClick={() => onTypeFilterChange(pill.key)}
          >
            {pill.label}
          </button>
        ))}
      </div>
    </>
  )
}
