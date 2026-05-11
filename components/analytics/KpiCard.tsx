'use client'

import { fmt } from '@/lib/formatting'

interface KpiCardProps {
  type: 'ingresos' | 'gastos'
  value: number
  deltaVsAnterior: number | null
  deltaVsAnio: number | null
  deltaRef: string
  activeLabel: string
  isCurrentBar: boolean
}

function formatDelta(delta: number | null): string {
  if (delta === null) return '—'
  return `${delta >= 0 ? '+' : ''}${Math.round(delta)}%`
}

export default function KpiCard({
  type, value, deltaVsAnterior, deltaVsAnio, deltaRef, activeLabel, isCurrentBar,
}: KpiCardProps) {
  const isIngresos = type === 'ingresos'
  const mainColor  = isIngresos ? '#22c55e' : '#ef4444'
  const label      = isIngresos ? 'Ingresos' : 'Gastos'

  // Smart color for YoY: + is good for Ingresos, bad for Gastos
  const yoyPositive = deltaVsAnio !== null && deltaVsAnio > 0
  const yoyColor = isIngresos
    ? (yoyPositive ? '#22c55e' : '#ef4444')
    : (yoyPositive ? '#ef4444' : '#22c55e')

  const fontSize = value >= 10000 ? 28 : 44

  return (
    <div
      className="flex flex-1 flex-col"
      style={{ background: 'var(--secondary)', borderRadius: 20, padding: 20 }}
    >
      {/* Header row */}
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        {!isCurrentBar && (
          <span
            className="text-[10px] font-bold text-white"
            style={{ background: '#6366f1', borderRadius: 8, padding: '2px 6px' }}
          >
            {activeLabel}
          </span>
        )}
      </div>

      {/* Main value */}
      <div
        className="mb-2 font-extrabold leading-none"
        style={{ fontSize, color: mainColor }}
      >
        {fmt(value)} €
      </div>

      {/* Badge vs período anterior — neutral */}
      <div
        className="mb-1.5 w-fit rounded-full px-2.5 py-0.5 text-[10px] font-bold"
        style={{
          background: 'color-mix(in srgb, var(--muted-foreground) 14%, transparent)',
          color: 'var(--muted-foreground)',
        }}
      >
        {formatDelta(deltaVsAnterior)} {deltaRef}
      </div>

      {/* Badge vs año anterior — smart color */}
      <div
        className="flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5"
        style={{ background: `${yoyColor}18` }}
      >
        <span className="text-[10px] font-bold" style={{ color: yoyColor }}>
          {formatDelta(deltaVsAnio)}
        </span>
        <span className="text-[10px] text-muted-foreground">vs año anterior</span>
      </div>
    </div>
  )
}
