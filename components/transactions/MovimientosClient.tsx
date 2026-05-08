'use client'

import { useState } from 'react'
import { Search, X, ChevronDown, Box } from 'lucide-react'
import { TxRow } from './TxRow'
import { AccountFilter } from './AccountFilter'
import { CATEGORY_META } from '@/lib/theme'
import { fmt } from '@/lib/formatting'
import type { Account, CategoryId, TransactionWithAccount } from '@/types'

type TypeFilter = 'todos' | 'ingresos' | 'gastos' | 'no-computable'

const TYPE_PILLS: { key: TypeFilter; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'ingresos', label: 'Ingresos' },
  { key: 'gastos', label: 'Gastos' },
  { key: 'no-computable', label: 'No Computable' },
]

interface MovimientosClientProps {
  initialTransactions: TransactionWithAccount[]
  accounts: Pick<Account, 'id' | 'name' | 'color' | 'number'>[]
}

function formatDayLabel(dateStr: string): string {
  const today = new Date().toISOString().slice(0, 10)
  const yest = new Date()
  yest.setDate(yest.getDate() - 1)
  const yesterdayStr = yest.toISOString().slice(0, 10)
  if (dateStr === today) return 'Hoy'
  if (dateStr === yesterdayStr) return 'Ayer'
  const [y, m, d] = dateStr.split('-').map(Number)
  const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  return `${d} ${MONTHS[m - 1]} ${y}`
}

export function MovimientosClient({ initialTransactions, accounts }: MovimientosClientProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('todos')
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([])
  const [showAccountFilter, setShowAccountFilter] = useState(false)

  // Derived: account button label
  const accountLabel =
    selectedAccountIds.length === 0
      ? 'Todas las cuentas'
      : selectedAccountIds.length === 1
        ? (accounts.find(a => a.id === selectedAccountIds[0])?.name ?? '1 cuenta')
        : `${selectedAccountIds.length} cuentas`

  // Client-side filtering
  let filtered = initialTransactions

  if (selectedAccountIds.length > 0) {
    filtered = filtered.filter(tx => selectedAccountIds.includes(tx.account_id))
  }

  if (typeFilter === 'ingresos') {
    filtered = filtered.filter(tx => tx.amount > 0 && tx.is_computable)
  } else if (typeFilter === 'gastos') {
    filtered = filtered.filter(tx => tx.amount < 0 && tx.is_computable)
  } else if (typeFilter === 'no-computable') {
    filtered = filtered.filter(tx => !tx.is_computable)
  }

  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase()
    filtered = filtered.filter(tx => {
      if (tx.description.toLowerCase().includes(q)) return true
      const cat = (tx.category_manual ?? tx.category ?? 'other') as CategoryId
      const label = CATEGORY_META[cat]?.label ?? ''
      return label.toLowerCase().includes(q)
    })
  }

  // Group by date
  const groups = new Map<string, { transactions: TransactionWithAccount[]; net: number }>()
  for (const tx of filtered) {
    const existing = groups.get(tx.date)
    if (existing) {
      existing.transactions.push(tx)
      existing.net += tx.amount
    } else {
      groups.set(tx.date, { transactions: [tx], net: tx.amount })
    }
  }

  const sortedDates = Array.from(groups.keys()).sort((a, b) => b.localeCompare(a))

  return (
    <div className="px-5 pt-14 pb-6 flex flex-col gap-4">
      <h1 className="text-xl font-bold text-foreground">Movimientos</h1>

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
          onChange={e => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="text-muted-foreground hover:text-foreground shrink-0">
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
        onClick={() => setShowAccountFilter(true)}
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
            onClick={() => setTypeFilter(pill.key)}
          >
            {pill.label}
          </button>
        ))}
      </div>

      {/* Transaction list */}
      {sortedDates.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-muted-foreground text-center">No hay movimientos con estos filtros</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {sortedDates.map(date => {
            const group = groups.get(date)!
            const net = group.net
            const netStr = (net >= 0 ? '+' : '') + fmt(net, 2) + ' €'
            const netColor = net >= 0 ? '#22c55e' : 'var(--foreground)'

            return (
              <div key={date} className="flex flex-col gap-0.5">
                {/* Day header */}
                <div className="flex items-center justify-between px-3 pb-1">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                    {formatDayLabel(date)}
                  </span>
                  <span className="text-xs font-bold" style={{ color: netColor }}>
                    {netStr}
                  </span>
                </div>

                {/* Transactions */}
                <div className="flex flex-col bg-card rounded-2xl overflow-clip divide-y divide-border/40">
                  {group.transactions.map(tx => (
                    <TxRow key={tx.id} tx={tx} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Account filter bottom sheet */}
      {showAccountFilter && (
        <AccountFilter
          accounts={accounts}
          selectedIds={selectedAccountIds}
          onSelectionChange={setSelectedAccountIds}
          onClose={() => setShowAccountFilter(false)}
        />
      )}
    </div>
  )
}
