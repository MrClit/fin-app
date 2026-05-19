'use client'

import { useState } from 'react'
import { Trash2, Calendar, CreditCard } from 'lucide-react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { CATEGORY_META, SIN_CATEGORIA } from '@/lib/theme'
import { fmt } from '@/lib/formatting'
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
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '13px 16px',
        borderRadius: 16,
        background: 'var(--muted)',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div style={{
        width: 34,
        height: 34,
        borderRadius: 10,
        background: 'var(--muted-foreground/10)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        opacity: 0.6,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 10,
          color: 'var(--muted-foreground)',
          fontWeight: 600,
          marginBottom: 2,
          textTransform: 'uppercase',
          letterSpacing: 0.4,
        }}>
          {label}
        </div>
        {children}
      </div>
      {chevron && (
        <span style={{ fontSize: 16, color: 'var(--muted-foreground)', flexShrink: 0, lineHeight: 1 }}>›</span>
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
  const amountColor = renderTx.amount > 0 ? '#22c55e' : 'var(--foreground)'

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
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 60,
            height: 60,
            borderRadius: 18,
            background: meta.color + '20',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
          }}>
            <Icon size={26} style={{ color: meta.color }} strokeWidth={2} />
          </div>
          <div className="text-sm font-bold text-foreground mb-1 line-clamp-3 px-4">{renderTx.description}</div>
          <div style={{
            fontSize: 44,
            fontWeight: 800,
            letterSpacing: -2,
            color: amountColor,
            lineHeight: 1,
          }}>
            {amountStr}
          </div>
        </div>

        {/* Campos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
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
              <div style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: meta.color + '22',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
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
              style={{
                width: '100%',
                background: 'transparent',
                border: '1.5px solid rgba(239,68,68,0.3)',
                borderRadius: 16,
                padding: '13px',
                color: '#ef4444',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <Trash2 size={15} />
              Eliminar movimiento
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p className="text-xs text-muted-foreground text-center mb-1">
                ¿Seguro que quieres eliminar este movimiento? Esta acción no se puede deshacer.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setConfirmDelete(false)}
                  style={{
                    flex: 1,
                    background: 'var(--muted)',
                    border: 'none',
                    borderRadius: 14,
                    padding: '13px',
                    color: 'var(--foreground)',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => onDelete(renderTx.id)}
                  style={{
                    flex: 1,
                    background: '#ef4444',
                    border: 'none',
                    borderRadius: 14,
                    padding: '13px',
                    color: 'white',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Sí, eliminar
                </button>
              </div>
            </div>
          )
        ) : (
          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted-foreground)', padding: '8px 0' }}>
            Las transacciones importadas no se pueden eliminar
          </p>
        )}
      </SheetContent>
    </Sheet>
  )
}
