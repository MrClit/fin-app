'use client'

import { useState } from 'react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { CATEGORY_META } from '@/lib/theme'
import type { CategoryId, CategoryType, TransactionWithAccount } from '@/types'

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

  const visibleCategories = ENTRIES.filter(([, meta]) => meta.type === activeType)

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
        <p className="text-xs text-muted-foreground mb-4 truncate">{tx.description}</p>

        {/* Selector de tipo */}
        <div
          className="flex mb-4 rounded-xl overflow-clip"
          style={{ background: 'var(--muted)', padding: 3, gap: 2 }}
        >
          {(Object.keys(TYPE_LABELS) as CategoryType[]).map(type => (
            <button
              key={type}
              onClick={() => setActiveType(type)}
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

        {/* Grid de categorías scrollable */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {visibleCategories.map(([id, meta]) => {
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
        </div>
      </SheetContent>
    </Sheet>
  )
}
