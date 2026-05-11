'use client'

import { createPortal } from 'react-dom'
import type { Granularity } from '@/types'
import { useAnalytics } from '@/contexts/AnalyticsContext'

const OPTIONS: { id: Granularity; label: string }[] = [
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mes' },
  { id: 'quarter', label: 'Trimestre' },
  { id: 'year', label: 'Año' },
]

export default function GranPicker() {
  const { gran, setGran, setShowPicker } = useAnalytics()

  function select(g: Granularity) {
    setGran(g)
    setShowPicker(false)
  }

  return createPortal(
    <div
      className="fixed inset-0 flex items-end"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', zIndex: 300 }}
      onClick={() => setShowPicker(false)}
    >
      <div
        className="w-full mx-auto bg-popover flex flex-col"
        style={{ maxWidth: 420, borderRadius: '28px 28px 0 0', padding: '20px 20px 40px' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-border rounded-full mx-auto mb-5" />
        <p className="text-base font-bold text-foreground text-center mb-4">Ver por período</p>
        <div className="flex flex-col gap-2">
          {OPTIONS.map(o => {
            const active = gran === o.id
            return (
              <button
                key={o.id}
                onClick={() => select(o.id)}
                className="flex items-center justify-between rounded-2xl border-none cursor-pointer transition-all duration-150"
                style={{
                  padding: '14px 16px',
                  background: active ? 'color-mix(in srgb, #6366f1 12%, transparent)' : 'var(--secondary)',
                  borderLeft: active ? '3px solid #6366f1' : '3px solid transparent',
                }}
              >
                <p className="text-sm font-bold" style={{ color: active ? '#6366f1' : 'var(--foreground)' }}>
                  {o.label}
                </p>
                {active && (
                  <div
                    className="flex items-center justify-center shrink-0"
                    style={{ width: 22, height: 22, borderRadius: '50%', background: '#6366f1' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>,
    document.body
  )
}
