'use client'

import { useState } from 'react'
import { Search, X } from 'lucide-react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { CATEGORY_META } from '@/lib/theme'
import type { CategoryId, CategoryType, TransactionWithAccount } from '@/types'

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')

interface CategoryPickerProps {
  tx: TransactionWithAccount
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (txId: string, category: CategoryId) => void
}

const TYPE_LABELS: Record<CategoryType, string> = {
  expense:         'Gastos',
  income:          'Ingresos',
  non_computable:  'No Computable',
}

const ENTRIES = Object.entries(CATEGORY_META) as [CategoryId, typeof CATEGORY_META[CategoryId]][]

function initialTab(tx: TransactionWithAccount): CategoryType {
  const effective = (tx.category_manual ?? tx.category) as CategoryId | null
  if (effective && CATEGORY_META[effective]) return CATEGORY_META[effective].type
  return tx.amount < 0 ? 'expense' : 'income'
}

export function CategoryPicker({ tx, open, onOpenChange, onSelect }: CategoryPickerProps) {
  const effectiveCategory = (tx.category_manual ?? tx.category ?? 'other') as CategoryId
  const [activeType, setActiveType] = useState<CategoryType>(() => initialTab(tx))
  const [query, setQuery] = useState('')

  const visibleCategories = ENTRIES.filter(([, meta]) => meta.type === activeType)
  const q = norm(query.trim())
  const filteredCategories = q
    ? visibleCategories.filter(([, meta]) => norm(meta.label).includes(q))
    : visibleCategories

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="mx-auto flex w-full max-w-105 flex-col rounded-t-[28px] bg-popover px-5 pt-5 pb-[max(env(safe-area-inset-bottom),2.5rem)]"
        style={{ maxHeight: '82dvh' }}
      >
        <SheetTitle className="sr-only">Cambiar categoría</SheetTitle>
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-border" />
        <p className="text-base font-bold text-foreground mb-1">Cambiar categoría</p>
        <p className="text-xs leading-relaxed text-muted-foreground mb-4 wrap-break-word">{tx.description}</p>

        {/* Selector de tipo */}
        <div
          className="flex mb-4 rounded-xl overflow-clip"
          style={{ background: 'var(--muted)', padding: 3, gap: 2 }}
        >
          {(Object.keys(TYPE_LABELS) as CategoryType[]).map(type => (
            <button
              key={type}
              onClick={() => { setActiveType(type); setQuery('') }}
              style={{
                flex: 1,
                padding: '7px 4px',
                borderRadius: 9,
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
                transition: 'all 0.15s',
                background: activeType === type ? 'var(--popover)' : 'transparent',
                color: activeType === type ? 'var(--foreground)' : 'var(--muted-foreground)',
                boxShadow: activeType === type ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
              }}
            >
              {TYPE_LABELS[type]}
            </button>
          ))}
        </div>

        {/* Buscador de categorías */}
        <div
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-[14px] bg-muted mb-3"
          style={{ border: '1px solid var(--border)' }}
        >
          <Search size={16} className="text-muted-foreground shrink-0" />
          <input
            type="text"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            placeholder="Buscar categoría…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-muted-foreground hover:text-foreground shrink-0">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Grid de categorías scrollable */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {filteredCategories.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">Sin resultados</p>
          ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {filteredCategories.map(([id, meta]) => {
              const Icon = meta.Icon
              const isCurrent = effectiveCategory === id
              return (
                <button
                  key={id}
                  onClick={() => { onSelect(tx.id, id); onOpenChange(false) }}
                  style={{
                    padding: '12px 4px',
                    borderRadius: 14,
                    border: isCurrent ? `2px solid ${meta.color}` : '1px solid var(--border)',
                    background: isCurrent ? meta.color + '18' : 'var(--muted)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 9,
                    background: meta.color + '22',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={16} style={{ color: meta.color }} strokeWidth={2} />
                  </div>
                  <span className="text-[10px] font-semibold text-foreground text-center leading-tight">
                    {meta.label}
                  </span>
                </button>
              )
            })}
          </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
