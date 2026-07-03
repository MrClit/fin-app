'use client'

import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import type { Granularity } from '@/types'
import { useAnalytics } from '@/contexts/AnalyticsContext'

const OPTIONS: { id: Granularity; label: string }[] = [
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mes' },
  { id: 'quarter', label: 'Trimestre' },
  { id: 'year', label: 'Año' },
]

export default function GranularityPicker() {
  const { granularity, setGranularity, showPicker, setShowPicker } = useAnalytics()

  function select(g: Granularity) {
    setGranularity(g)
    setShowPicker(false)
  }

  return (
    <Sheet open={showPicker} onOpenChange={setShowPicker}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="mx-auto w-full max-w-105 rounded-t-[28px] bg-popover px-5 pt-5 pb-[max(env(safe-area-inset-bottom),2.5rem)]"
      >
        <SheetTitle className="sr-only">Ver por período</SheetTitle>
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-border" />
        <p className="text-base font-bold text-foreground text-center mb-4">Ver por período</p>
        <div className="flex flex-col gap-2">
          {OPTIONS.map(o => {
            const active = granularity === o.id
            return (
              <button
                key={o.id}
                onClick={() => select(o.id)}
                className="flex items-center justify-between rounded-2xl border-none cursor-pointer transition-colors duration-150"
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
      </SheetContent>
    </Sheet>
  )
}
