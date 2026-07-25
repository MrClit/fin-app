'use client'

import { Search, X, ChevronDown, Box } from 'lucide-react'
import type { Account } from '@/types'
import { TYPE_PILLS, type TypeFilter } from './useTransactionsFilters'
import { cn } from '@/lib/utils'

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
      {/* El `outline-none` del input no se queda sin sustituto (#369): el anillo de
          foco lo pinta el contenedor con `focus-within`, que es quien tiene el borde
          y el radio — un outline pegado al input desnudo quedaría dentro de la caja. */}
      <div
        className="flex items-center gap-2 px-3.5 py-2.5 rounded-[14px] bg-muted
                   focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring"
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
        className={cn(
          'w-full flex items-center justify-between px-3.5 py-2.5 rounded-[14px] border transition-colors',
          selectedAccountIds.length > 0
            ? 'border-primary/30 bg-primary/10 hover:bg-primary/20'
            : 'border-border bg-muted hover:bg-muted-foreground/15'
        )}
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
              className="rounded-full text-3xs font-bold px-1.5 py-0.5 leading-none"
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
            aria-pressed={typeFilter === pill.key}
            className={cn(
              'px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors shrink-0',
              typeFilter === pill.key
                ? 'bg-primary text-primary-foreground hover:bg-primary/85'
                : 'bg-muted text-muted-foreground hover:bg-muted-foreground/15'
            )}
            onClick={() => onTypeFilterChange(pill.key)}
          >
            {pill.label}
          </button>
        ))}
      </div>
    </>
  )
}
