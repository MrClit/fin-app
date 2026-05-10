'use client'

import type { Granularity } from '@/types'
import { fmt } from '@/lib/formatting'
import { PERIOD_LABELS } from '@/lib/analytics'

interface SavingsCardProps {
  ingresos: number
  ahorro: number
  gran: Granularity
}

export default function SavingsCard({ ingresos, ahorro, gran }: SavingsCardProps) {
  const isNegative = ahorro < 0
  const pct = ingresos > 0 && !isNegative ? Math.min(100, Math.round((ahorro / ingresos) * 100)) : 0

  const bg = isNegative
    ? 'linear-gradient(135deg, #ef4444, #dc2626)'
    : 'linear-gradient(135deg, #059669, #10b981)'
  const shadow = isNegative
    ? '0 10px 40px rgba(239,68,68,0.25)'
    : '0 10px 40px rgba(16,185,129,0.25)'

  return (
    <div style={{ background: bg, borderRadius: 20, padding: 20, boxShadow: shadow }}>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>
        Ahorro · {PERIOD_LABELS[gran]}
      </p>
      <p style={{ fontSize: 32, fontWeight: 800, color: 'white', marginBottom: 8 }}>
        {fmt(ahorro)} €
      </p>
      <div style={{ height: 6, background: 'rgba(255,255,255,0.2)', borderRadius: 3 }}>
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: 'white',
            borderRadius: 3,
            transition: 'width 0.6s ease',
          }}
        />
      </div>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 6 }}>
        {isNegative ? 'Gastos superiores a los ingresos' : `${pct}% de tus ingresos`}
      </p>
    </div>
  )
}
