'use client'

import { useState } from 'react'
import { Trash2, Calendar, CreditCard } from 'lucide-react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { CATEGORY_META, SIN_CATEGORIA } from '@/lib/theme'
import { fmt } from '@/lib/formatting'
import { cn } from '@/lib/utils'
import type { CategoryId, TransactionWithAccount } from '@/types'

interface TxModalProps {
  tx: TransactionWithAccount | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onRecategorize: (tx: TransactionWithAccount) => void
  onDelete: (txId: string) => void
}

interface FieldRowProps {
  label: string
  icon: React.ReactNode
  children: React.ReactNode
  onClick?: () => void
  chevron?: boolean
}

function FieldRow({ label, icon, children, onClick, chevron }: FieldRowProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-2xl bg-muted px-4 py-[13px]',
        onClick && 'cursor-pointer'
      )}
    >
      <div className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-[10px] bg-muted-foreground/10 opacity-60">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.4px] text-muted-foreground">
          {label}
        </div>
        {children}
      </div>
      {chevron && (
        <span className="shrink-0 text-base leading-none text-muted-foreground">›</span>
      )}
    </div>
  )
}

export function TxModal({ tx, open, onOpenChange, onRecategorize, onDelete }: TxModalProps) {
  const [cachedTx, setCachedTx] = useState<TransactionWithAccount | null>(tx)
  const [confirmDelete, setConfirmDelete] = useState(false)
  if (tx && tx !== cachedTx) {
    setCachedTx(tx)
    setConfirmDelete(false)
  }
  const renderTx = tx ?? cachedTx
  if (!renderTx) return null

  const effectiveCategory = (renderTx.category_manual ?? renderTx.category) as CategoryId | null
  const meta = effectiveCategory ? (CATEGORY_META[effectiveCategory] ?? CATEGORY_META.other) : SIN_CATEGORIA
  const Icon = meta.Icon

  const dateStr = (() => {
    const [y, m, d] = renderTx.date.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  })()

  const absAmount = fmt(Math.abs(renderTx.amount), 2)
  const amountStr = (renderTx.amount > 0 ? '+' : '-') + absAmount + ' €'
  const isPositive = renderTx.amount > 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="mx-auto w-full max-w-105 rounded-t-[28px] bg-popover px-5 pt-5 pb-[max(env(safe-area-inset-bottom),2.5rem)]"
      >
        <SheetTitle className="sr-only">{renderTx.description}</SheetTitle>
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-border" />

        {/* Importe prominente */}
        <div className="mb-6 text-center">
          <div
            className="mx-auto mb-3 flex h-15 w-15 items-center justify-center rounded-[18px]"
            style={{ background: meta.color + '20' }}
          >
            <Icon size={26} style={{ color: meta.color }} strokeWidth={2} />
          </div>
          <div className="text-sm font-bold text-foreground mb-1 line-clamp-3 px-4">{renderTx.description}</div>
          <div
            className={cn(
              'text-[44px] font-extrabold leading-none tracking-[-2px]',
              isPositive ? 'text-[#22c55e]' : 'text-foreground'
            )}
          >
            {amountStr}
          </div>
        </div>

        {/* Campos */}
        <div className="mb-5 flex flex-col gap-2">
          <FieldRow
            label="Fecha"
            icon={<Calendar size={16} className="text-muted-foreground" />}
          >
            <span className="text-sm font-semibold text-foreground capitalize">{dateStr}</span>
          </FieldRow>

          <FieldRow
            label="Cuenta"
            icon={<CreditCard size={16} className="text-muted-foreground" />}
          >
            <span className="text-sm font-semibold text-foreground">{renderTx.account?.name ?? '—'}</span>
          </FieldRow>

          <FieldRow
            label="Categoría"
            chevron
            onClick={() => onRecategorize(renderTx)}
            icon={
              <div
                className="flex h-8.5 w-8.5 items-center justify-center rounded-[10px]"
                style={{ background: meta.color + '22' }}
              >
                <Icon size={16} style={{ color: meta.color }} strokeWidth={2} />
              </div>
            }
          >
            <span className="text-sm font-semibold text-foreground">{meta.label}</span>
          </FieldRow>
        </div>

        {/* Eliminar */}
        {renderTx.source === 'manual' ? (
          !confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex w-full items-center justify-center gap-1.5 rounded-2xl border-[1.5px] border-destructive/30 bg-transparent py-[13px] text-sm font-semibold text-destructive"
            >
              <Trash2 size={15} />
              Eliminar movimiento
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-muted-foreground text-center mb-1">
                ¿Seguro que quieres eliminar este movimiento? Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-2.5">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 rounded-[14px] border-0 bg-muted py-[13px] text-sm font-semibold text-foreground"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => onDelete(renderTx.id)}
                  className="flex-1 rounded-[14px] border-0 bg-destructive py-[13px] text-sm font-bold text-white"
                >
                  Sí, eliminar
                </button>
              </div>
            </div>
          )
        ) : (
          <p className="text-center text-xs text-muted-foreground py-2">
            Las transacciones importadas no se pueden eliminar
          </p>
        )}
      </SheetContent>
    </Sheet>
  )
}
