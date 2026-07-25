'use client'

import { Amount } from '@/components/ui/amount'
import { PERIOD_LABELS } from '@/lib/analytics'
import type { CategoryMeta } from '@/lib/categories'
import type { Granularity } from '@/types'

function CalendarIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

interface Props {
  meta: CategoryMeta
  granularity: Granularity
  onBack: () => void
  onOpenPicker: () => void
  /** Resumen «N movimientos · importe»; oculto mientras cargan las transacciones. */
  showSummary: boolean
  txCount: number
  periodTotal: number
}

// El z-40 es deliberado (#304): por debajo de la franja de status bar de iOS
// (z-90 en el root layout) y al nivel del resto de headers sticky.
export default function CategoryDetailHeader({
  meta,
  granularity,
  onBack,
  onOpenPicker,
  showSummary,
  txCount,
  periodTotal,
}: Props) {
  const { Icon, label, color } = meta

  return (
    <div className="sticky top-0 z-40 border-b border-border bg-background/92 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+52px)] backdrop-blur-lg">
      <div className="flex items-center justify-between">
        {/* Left: back + icon + name */}
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <button
            onClick={onBack}
            aria-label="Volver"
            className="flex size-8.5 shrink-0 cursor-pointer items-center justify-center rounded-[10px] bg-secondary text-foreground transition-colors hover:bg-muted-foreground/15"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div
            className="flex size-7.5 shrink-0 items-center justify-center rounded-[8px]"
            style={{ background: color + '20' }}
          >
            <Icon size={15} color={color} strokeWidth={2} />
          </div>
          <span className="truncate text-base font-bold text-foreground">{label}</span>
        </div>
        {/* Right: period selector */}
        <button
          onClick={onOpenPicker}
          className="ml-2 flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-[#6366f1]/27 bg-[#6366f1]/12 px-3 py-1.5 text-[#6366f1] transition-colors hover:bg-[#6366f1]/20"
        >
          <CalendarIcon />
          <span className="text-xs font-bold">{PERIOD_LABELS[granularity]}</span>
          <span className="text-3xs opacity-70">▾</span>
        </button>
      </div>
      {showSummary && (
        <p className="mt-1 pl-11 text-xs text-muted-foreground">
          {txCount} movimiento{txCount !== 1 ? 's' : ''}{' '}
          ·{' '}
          <span className="font-bold" style={{ color }}>
            <Amount value={periodTotal} decimals={2} />
          </span>
        </p>
      )}
    </div>
  )
}
