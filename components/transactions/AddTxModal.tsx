'use client'

import { useState } from 'react'
import { FileText, Calendar, CreditCard } from 'lucide-react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useSyncStatus } from '@/components/sync/SyncStatusProvider'
import { CATEGORY_META } from '@/lib/theme'
import type { CategoryId, TransactionWithAccount } from '@/types'

interface AddTxModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  manualAccountId: string
  onSave: (tx: TransactionWithAccount) => void
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

const EXPENSE_COLOR = 'var(--negative)'
const INCOME_COLOR = 'var(--positive)'

export function AddTxModal({ open, onOpenChange, manualAccountId, onSave }: AddTxModalProps) {
  const [type, setType] = useState<'gasto' | 'ingreso'>('gasto')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [category, setCategory] = useState<CategoryId>('other')
  const [showCatGrid, setShowCatGrid] = useState(false)
  const [saving, setSaving] = useState(false)
  const { showToast } = useSyncStatus()

  const accentColor = type === 'gasto' ? EXPENSE_COLOR : INCOME_COLOR
  const parsedAmount = parseFloat(amount)
  const isValid = !isNaN(parsedAmount) && parsedAmount > 0

  const categoryEntries = (Object.entries(CATEGORY_META) as [CategoryId, typeof CATEGORY_META[CategoryId]][]).filter(([id]) =>
    type === 'ingreso' ? id === 'payroll' || id === 'other' : id !== 'payroll'
  )

  const currentMeta = CATEGORY_META[category] ?? CATEGORY_META.other
  const CurrentIcon = currentMeta.Icon

  async function handleSave() {
    if (!isValid || saving) return
    setSaving(true)
    try {
      const sign = type === 'gasto' ? -1 : 1
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: sign * parsedAmount,
          description,
          date,
          category_manual: category,
          account_id: manualAccountId,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      const { data: tx } = await res.json()
      onSave(tx)
      onOpenChange(false)
    } catch (err) {
      console.error('[AddTxModal] Error guardando:', err)
      showToast('No se pudo guardar el movimiento', handleSave)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="mx-auto w-full max-w-105 rounded-t-[28px] bg-popover px-5 pt-5 pb-[max(env(safe-area-inset-bottom),2.5rem)]"
      >
        <SheetTitle className="sr-only">Nuevo movimiento</SheetTitle>
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-border" />

        {/* Toggle + importe */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            display: 'inline-flex',
            background: 'var(--muted)',
            borderRadius: 20,
            padding: 3,
            marginBottom: 16,
          }}>
            {(['gasto', 'ingreso'] as const).map(tp => (
              <button
                key={tp}
                onClick={() => {
                  setType(tp)
                  if (tp === 'ingreso' && category !== 'payroll' && category !== 'other') {
                    setCategory('other')
                  }
                  if (tp === 'gasto' && category === 'payroll') {
                    setCategory('other')
                  }
                }}
                style={{
                  padding: '6px 20px',
                  borderRadius: 20,
                  border: 'none',
                  background: type === tp ? (tp === 'gasto' ? EXPENSE_COLOR : INCOME_COLOR) : 'transparent',
                  color: type === tp ? 'white' : 'var(--muted-foreground)',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  transition: 'all 0.2s',
                }}
              >
                {tp}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 6 }}>
            <input
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0,00"
              type="number"
              min="0"
              step="0.01"
              autoFocus
              style={{
                fontSize: 48,
                fontWeight: 800,
                letterSpacing: -2,
                color: amount ? accentColor : 'var(--muted-foreground)',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                width: 180,
                textAlign: 'right',
                fontFamily: 'inherit',
                caretColor: accentColor,
              }}
            />
            <span style={{ fontSize: 28, fontWeight: 700, color: amount ? accentColor : 'var(--muted-foreground)' }}>€</span>
          </div>
        </div>

        {/* Campos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          <FieldRow label="Descripción" icon={<FileText size={16} className="text-muted-foreground" />}>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Ej: Café con Juan"
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--foreground)',
                width: '100%',
                fontFamily: 'inherit',
              }}
            />
          </FieldRow>

          <FieldRow label="Fecha" icon={<Calendar size={16} className="text-muted-foreground" />}>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--foreground)',
                width: '100%',
                fontFamily: 'inherit',
              }}
            />
          </FieldRow>

          <FieldRow label="Cuenta" icon={<CreditCard size={16} className="text-muted-foreground" />}>
            <span className="text-sm font-semibold text-muted-foreground">Manual</span>
          </FieldRow>

          <FieldRow
            label="Categoría"
            chevron
            onClick={() => setShowCatGrid(g => !g)}
            icon={
              <div style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: currentMeta.color + '22',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <CurrentIcon size={16} style={{ color: currentMeta.color }} strokeWidth={2} />
              </div>
            }
          >
            <span className="text-sm font-semibold text-foreground">{currentMeta.label}</span>
          </FieldRow>

          {showCatGrid && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {categoryEntries.map(([id, meta]) => {
                const Icon = meta.Icon
                const isCurrent = category === id
                return (
                  <button
                    key={id}
                    onClick={() => { setCategory(id); setShowCatGrid(false) }}
                    style={{
                      padding: '12px 8px',
                      borderRadius: 12,
                      border: isCurrent ? `2px solid ${meta.color}` : '1px solid var(--border)',
                      background: isCurrent ? meta.color + '15' : 'var(--muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 5,
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: meta.color + '22',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Icon size={15} style={{ color: meta.color }} strokeWidth={2} />
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--foreground)', textAlign: 'center' }}>
                      {meta.label}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Guardar */}
        <button
          onClick={handleSave}
          disabled={!isValid || saving}
          style={{
            width: '100%',
            border: 'none',
            borderRadius: 16,
            padding: '15px',
            background: isValid ? `linear-gradient(135deg, ${accentColor}, color-mix(in srgb, ${accentColor} 87%, transparent))` : 'var(--muted)',
            color: isValid ? 'white' : 'var(--muted-foreground)',
            fontSize: 15,
            fontWeight: 700,
            cursor: isValid ? 'pointer' : 'default',
            transition: 'all 0.2s',
            boxShadow: isValid ? `0 8px 24px color-mix(in srgb, ${accentColor} 27%, transparent)` : 'none',
          }}
        >
          {saving ? 'Guardando…' : 'Guardar movimiento'}
        </button>
      </SheetContent>
    </Sheet>
  )
}
