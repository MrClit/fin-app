'use client'

import { Amount } from '@/components/ui/amount'

interface KpiCardProps {
  type: 'income' | 'expense'
  value: number
  deltaVsPrev: number | null
  deltaVsYear: number | null
  deltaRef: string
}

function formatDelta(delta: number | null): string {
  if (delta === null) return '—'
  return `${delta >= 0 ? '+' : ''}${Math.round(delta)}%`
}

export default function KpiCard({
  type, value, deltaVsPrev, deltaVsYear, deltaRef,
}: KpiCardProps) {
  const isIncome = type === 'income'
  const mainColor  = isIncome ? 'var(--positive)' : 'var(--negative)'
  const label      = isIncome ? 'Ingresos' : 'Gastos'

  // Smart color for YoY: + is good for Ingresos, bad for Gastos
  const yoyPositive = deltaVsYear !== null && deltaVsYear > 0
  const yoyGood  = isIncome === yoyPositive
  const yoyColor = yoyGood ? 'var(--positive)' : 'var(--negative)'
  const yoyBg    = yoyGood ? 'var(--positive-subtle)' : 'var(--negative-subtle)'

  const fontSize = value >= 10000 ? 20 : 28

  return (
    <div className="flex flex-1 flex-col">
      {/* Header row */}
      <div className="mb-1.5">
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>

      {/* Main value */}
      <div
        className="mb-2 font-extrabold leading-none"
        style={{ fontSize, color: mainColor }}
      >
        <Amount value={value} />
      </div>

      {/* Badge vs período anterior — neutral */}
      <div
        className="mb-1.5 w-fit rounded-full px-2.5 py-0.5 text-[10px] font-bold"
        style={{
          background: 'color-mix(in srgb, var(--muted-foreground) 14%, transparent)',
          color: 'var(--muted-foreground)',
        }}
      >
        {formatDelta(deltaVsPrev)} {deltaRef}
      </div>

      {/* Badge vs año anterior — smart color */}
      <div
        className="flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5"
        style={{ background: yoyBg }}
      >
        <span className="text-[10px] font-bold" style={{ color: yoyColor }}>
          {formatDelta(deltaVsYear)}
        </span>
        <span className="text-[10px] text-muted-foreground">vs año anterior</span>
      </div>
    </div>
  )
}
