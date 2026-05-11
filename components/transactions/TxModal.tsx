'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Trash2, Calendar, CreditCard, Tag } from 'lucide-react'
import { CATEGORY_META, SIN_CATEGORIA } from '@/lib/theme'
import { fmt } from '@/lib/formatting'
import type { CategoryId, TransactionWithAccount } from '@/types'

interface TxModalProps {
  tx: TransactionWithAccount
  onClose: () => void
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

export function TxModal({ tx, onClose, onRecategorize, onDelete }: TxModalProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  const effectiveCategory = (tx.category_manual ?? tx.category) as CategoryId | null
  const meta = effectiveCategory ? (CATEGORY_META[effectiveCategory] ?? CATEGORY_META.other) : SIN_CATEGORIA
  const Icon = meta.Icon

  const dateStr = (() => {
    const [y, m, d] = tx.date.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  })()

  const absAmount = fmt(Math.abs(tx.amount), 2)
  const amountStr = (tx.amount > 0 ? '+' : '-') + absAmount + ' €'
  const amountColor = tx.amount > 0 ? '#22c55e' : 'var(--foreground)'

  return createPortal(
    <div
      className="fixed inset-0 flex items-end"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', zIndex: 350 }}
      onClick={onClose}
    >
      <div
        className="w-full mx-auto bg-popover flex flex-col"
        style={{ maxWidth: 420, borderRadius: '28px 28px 0 0', padding: '20px 20px 40px' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-border rounded-full mx-auto mb-5" />

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
          <div className="text-sm font-bold text-foreground mb-1 truncate px-4">{tx.description}</div>
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
            <span className="text-sm font-semibold text-foreground">{tx.account?.name ?? '—'}</span>
          </FieldRow>

          <FieldRow
            label="Categoría"
            chevron
            onClick={() => onRecategorize(tx)}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="text-sm font-semibold text-foreground">{meta.label}</span>
              {tx.category_manual && (
                <span
                  className="rounded-full text-[9px] font-bold px-1.5 py-0.5 leading-none shrink-0"
                  style={{ background: '#6366f1', color: 'white' }}
                >
                  EDITADA
                </span>
              )}
            </div>
          </FieldRow>
        </div>

        {/* Eliminar */}
        {tx.source === 'manual' ? (
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
                  onClick={() => onDelete(tx.id)}
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
      </div>
    </div>,
    document.body
  )
}
