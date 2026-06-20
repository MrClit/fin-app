'use client'

import type { Granularity } from '@/types'
import { Amount } from '@/components/ui/amount'
import { PERIOD_LABELS } from '@/lib/analytics'

interface SavingsCardProps {
  income: number
  savings: number
  granularity: Granularity
}

export default function SavingsCard({ income, savings, granularity }: SavingsCardProps) {
  const isNegative = savings < 0
  const pct = income > 0 && !isNegative ? Math.min(100, Math.round((savings / income) * 100)) : 0

  const bg = isNegative
    ? 'linear-gradient(135deg, #ef4444, #dc2626)'
    : 'linear-gradient(135deg, #059669, #10b981)'

  return (
    <div className="-mx-4 px-4 py-5" style={{ background: bg }}>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>
        Ahorro · {PERIOD_LABELS[granularity]}
      </p>
      <p style={{ fontSize: 32, fontWeight: 800, color: 'white', marginBottom: 8 }}>
        <Amount value={savings} />
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
