'use client'

import { createPortal } from 'react-dom'
import { Box } from 'lucide-react'
import type { Account } from '@/types'

interface AccountFilterProps {
  accounts: Pick<Account, 'id' | 'name' | 'color' | 'number'>[]
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
  onClose: () => void
}

export function AccountFilter({ accounts, selectedIds, onSelectionChange, onClose }: AccountFilterProps) {
  const allSelected = selectedIds.length === 0

  function toggleAccount(id: string) {
    if (selectedIds.includes(id)) {
      const next = selectedIds.filter(s => s !== id)
      onSelectionChange(next)
    } else {
      onSelectionChange([...selectedIds, id])
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 flex items-end"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', zIndex: 300 }}
      onClick={onClose}
    >
      <div
        className="w-full mx-auto bg-popover flex flex-col"
        style={{
          maxWidth: 420,
          borderRadius: '28px 28px 0 0',
          padding: '20px 20px 40px',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="w-10 h-1 bg-border rounded-full mx-auto mb-5" />

        <p className="text-base font-bold text-foreground mb-0.5">Filtrar por cuenta</p>
        <p className="text-xs text-muted-foreground mb-4">Selecciona una o varias cuentas</p>

        <div className="flex flex-col gap-2">
          {/* Todas las cuentas */}
          <button
            className="flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-colors"
            style={{
              background: allSelected ? 'rgba(99,102,241,0.08)' : 'var(--muted)',
              borderLeft: allSelected ? '3px solid #6366f1' : '3px solid transparent',
            }}
            onClick={() => { onSelectionChange([]); onClose() }}
          >
            <div
              className="flex items-center justify-center rounded-[10px] shrink-0"
              style={{ width: 34, height: 34, background: 'var(--border)' }}
            >
              <Box size={15} style={{ color: 'var(--muted-foreground)' }} strokeWidth={2} />
            </div>
            <span className="flex-1 text-sm font-semibold text-foreground">Todas las cuentas</span>
            {allSelected && (
              <div
                className="rounded-md flex items-center justify-center shrink-0"
                style={{ width: 20, height: 20, background: '#6366f1' }}
              >
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            )}
          </button>

          {/* Account list */}
          {accounts.map(account => {
            const isSelected = selectedIds.includes(account.id)
            const color = account.color ?? '#6366f1'
            const maskedNumber = account.number ? `•••• ${account.number.slice(-4)}` : null

            return (
              <button
                key={account.id}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-colors"
                style={{
                  background: isSelected ? 'rgba(99,102,241,0.08)' : 'var(--muted)',
                  borderLeft: isSelected ? '3px solid #6366f1' : '3px solid transparent',
                }}
                onClick={() => toggleAccount(account.id)}
              >
                <div
                  className="flex items-center justify-center rounded-[10px] shrink-0"
                  style={{ width: 34, height: 34, background: color + '22' }}
                >
                  <div className="rounded" style={{ width: 14, height: 14, background: color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{account.name}</p>
                  {maskedNumber && (
                    <p className="text-[11px] text-muted-foreground">{maskedNumber}</p>
                  )}
                </div>
                <div
                  className="rounded-md shrink-0 flex items-center justify-center"
                  style={{
                    width: 20,
                    height: 20,
                    background: isSelected ? '#6366f1' : 'transparent',
                    border: isSelected ? 'none' : '1.5px solid var(--border)',
                  }}
                >
                  {isSelected && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>,
    document.body
  )
}
