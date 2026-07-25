'use client'

import type { Granularity } from '@/types'
import { Amount } from '@/components/ui/amount'
import { PERIOD_LABELS } from '@/lib/analytics'
import KpiCard from './KpiCard'

interface PeriodVerdictProps {
  income: number
  expense: number
  savings: number
  granularity: Granularity
  deltaVsPrevIncome: number | null
  deltaVsYearIncome: number | null
  deltaVsPrevExpense: number | null
  deltaVsYearExpense: number | null
  deltaRef: string
}

/**
 * Bloque-veredicto: fusiona el ahorro del período (gradiente semáforo) y la fila
 * de KPIs Ingresos | Gastos en un único bloque full-width sin costura. Abre la
 * página de Análisis para responder de un vistazo a "¿cómo voy?" (#282).
 *
 * El -mx-4 y el border-y viven una sola vez en el contenedor externo; las dos
 * zonas internas solo llevan padding y fondo, así ahorro (gradiente) y KPIs
 * (bg-secondary) quedan pegados sin línea entre medias.
 */
export default function PeriodVerdict({
  income,
  expense,
  savings,
  granularity,
  deltaVsPrevIncome,
  deltaVsYearIncome,
  deltaVsPrevExpense,
  deltaVsYearExpense,
  deltaRef,
}: PeriodVerdictProps) {
  const isNegative = savings < 0
  const pct = income > 0 && !isNegative ? Math.min(100, Math.round((savings / income) * 100)) : 0

  const bg = isNegative
    ? 'linear-gradient(135deg, var(--negative), #dc2626)'
    : 'linear-gradient(135deg, #059669, #10b981)'

  return (
    // Desde `md` recupera marco de tarjeta (#368); `overflow-clip` para que las esquinas
    // redondeadas recorten el gradiente de la zona de ahorro.
    <div className="-mx-4 border-y border-border md:mx-0 md:overflow-clip md:rounded-2xl md:border">
      {/* Zona superior — ahorro */}
      <div className="px-4 py-5" style={{ background: bg }}>
        <p style={{ fontSize: 'var(--text-sm)', color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>
          Ahorro · {PERIOD_LABELS[granularity]}
        </p>
        <p style={{ fontSize: 'var(--text-amount-md)', fontWeight: 800, color: 'white', marginBottom: 8 }}>
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
        <p style={{ fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,0.7)', marginTop: 6 }}>
          {isNegative ? 'Gastos superiores a los ingresos' : `${pct}% de tus ingresos`}
        </p>
      </div>

      {/* Zona inferior — KPIs */}
      <div className="flex bg-secondary px-4 py-5">
        <div className="flex-1 pr-4">
          <KpiCard
            type="income"
            value={income}
            deltaVsPrev={deltaVsPrevIncome}
            deltaVsYear={deltaVsYearIncome}
            deltaRef={deltaRef}
          />
        </div>
        <div className="flex-1 border-l border-border pl-4">
          <KpiCard
            type="expense"
            value={expense}
            deltaVsPrev={deltaVsPrevExpense}
            deltaVsYear={deltaVsYearExpense}
            deltaRef={deltaRef}
          />
        </div>
      </div>
    </div>
  )
}
