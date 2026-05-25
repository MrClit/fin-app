'use client'

import { useState } from 'react'
import { Search, X } from 'lucide-react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { CATEGORY_META } from '@/lib/theme'
import { cn } from '@/lib/utils'
import type { CategoryId, CategoryType, TransactionWithAccount } from '@/types'

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')

interface CategoryPickerProps {
  tx: TransactionWithAccount | null
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
  const [cachedTx, setCachedTx] = useState<TransactionWithAccount | null>(tx)
  const [activeType, setActiveType] = useState<CategoryType>(() =>
    tx ? initialTab(tx) : 'expense'
  )
  const [query, setQuery] = useState('')

  if (tx && tx !== cachedTx) {
    setCachedTx(tx)
    setActiveType(initialTab(tx))
    setQuery('')
  }

  const renderTx = tx ?? cachedTx
  if (!renderTx) return null

  const effectiveCategory = (renderTx.category_manual ?? renderTx.category ?? 'other') as CategoryId

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
        style={{ height: '82dvh' }}
      >
        <SheetTitle className="sr-only">Cambiar categoría</SheetTitle>
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-border" />
        <p className="text-base font-bold text-foreground mb-1">Cambiar categoría</p>
        <p className="text-xs leading-relaxed text-muted-foreground mb-4 wrap-break-word">{renderTx.description}</p>

        {/* Selector de tipo */}
        <div className="mb-4 flex gap-0.5 overflow-clip rounded-xl bg-muted p-0.75">
          {(Object.keys(TYPE_LABELS) as CategoryType[]).map(type => (
            <button
              key={type}
              onClick={() => { setActiveType(type); setQuery('') }}
              className={cn(
                'flex-1 rounded-[9px] border-0 px-1 py-1.75 text-xs font-semibold transition-all',
                activeType === type
                  ? 'bg-popover text-foreground shadow-[0_1px_4px_rgba(0,0,0,0.12)]'
                  : 'bg-transparent text-muted-foreground'
              )}
            >
              {TYPE_LABELS[type]}
            </button>
          ))}
        </div>

        {/* Buscador de categorías */}
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-[14px] bg-muted mb-3 border border-border">
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
        <div className="flex-1 overflow-y-auto">
          {filteredCategories.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">Sin resultados</p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {filteredCategories.map(([id, meta]) => {
                const Icon = meta.Icon
                const isCurrent = effectiveCategory === id
                return (
                  <button
                    key={id}
                    onClick={() => { onSelect(renderTx.id, id); onOpenChange(false) }}
                    className={cn(
                      'flex flex-col items-center gap-1.25 rounded-[14px] px-1 py-3 transition-all',
                      isCurrent ? 'border-2' : 'border border-border bg-muted'
                    )}
                    style={
                      isCurrent
                        ? { borderColor: meta.color, background: meta.color + '18' }
                        : undefined
                    }
                  >
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-[9px]"
                      style={{ background: meta.color + '22' }}
                    >
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
