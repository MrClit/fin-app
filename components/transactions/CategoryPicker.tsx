'use client'

import { createPortal } from 'react-dom'
import { CATEGORY_META } from '@/lib/theme'
import type { CategoryId, TransactionWithAccount } from '@/types'

interface CategoryPickerProps {
  tx: TransactionWithAccount
  onClose: () => void
  onSelect: (txId: string, category: CategoryId) => void
}

export function CategoryPicker({ tx, onClose, onSelect }: CategoryPickerProps) {
  const effectiveCategory = (tx.category_manual ?? tx.category ?? 'other') as CategoryId

  return createPortal(
    <div
      className="fixed inset-0 flex items-end"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', zIndex: 400 }}
      onClick={onClose}
    >
      <div
        className="w-full mx-auto bg-popover flex flex-col"
        style={{ maxWidth: 420, borderRadius: '28px 28px 0 0', padding: '20px 20px 40px' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-border rounded-full mx-auto mb-5" />
        <p className="text-base font-bold text-foreground mb-1">Cambiar categoría</p>
        <p className="text-xs text-muted-foreground mb-4 truncate">{tx.description}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {(Object.entries(CATEGORY_META) as [CategoryId, typeof CATEGORY_META[CategoryId]][]).map(([id, meta]) => {
            const Icon = meta.Icon
            const isCurrent = effectiveCategory === id
            return (
              <button
                key={id}
                onClick={() => { onSelect(tx.id, id); onClose() }}
                style={{
                  padding: '14px 8px',
                  borderRadius: 14,
                  border: isCurrent ? `2px solid ${meta.color}` : '1px solid var(--border)',
                  background: isCurrent ? meta.color + '18' : 'var(--muted)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: meta.color + '22',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={18} style={{ color: meta.color }} strokeWidth={2} />
                </div>
                <span className="text-[11px] font-semibold text-foreground text-center leading-tight">
                  {meta.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>,
    document.body
  )
}
