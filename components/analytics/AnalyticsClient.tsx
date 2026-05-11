'use client'

import { useEffect, useState } from 'react'
import type { AnalyticsResponse } from '@/types'
import type { Granularity } from '@/types'
import { useAnalytics } from '@/contexts/AnalyticsContext'
import { PERIOD_LABELS } from '@/lib/analytics'
import GranPicker from './GranPicker'
import SavingsCard from './SavingsCard'
import KpiCard from './KpiCard'
import DualBarChart from './DualBarChart'

const DELTA_REF: Record<Granularity, string> = {
  week:    'vs sem. anterior',
  month:   'vs mes anterior',
  quarter: 'vs trimestre ant.',
  year:    'vs año anterior',
}

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

function CardSkeleton({ height = 120 }: { height?: number }) {
  return (
    <div
      className="animate-pulse"
      style={{ background: 'var(--secondary)', borderRadius: 20, height }}
    />
  )
}

export default function AnalyticsClient() {
  const { gran, showPicker, setShowPicker } = useAnalytics()
  const [data, setData] = useState<AnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedBarIdx, setSelectedBarIdx] = useState<number | null>(null)
  const [showYoY, setShowYoY] = useState(false)

  useEffect(() => {
    setLoading(true)
    setData(null)
    setSelectedBarIdx(null)
    setShowYoY(false)
    fetch(`/api/analytics?gran=${gran}&offset=0`)
      .then(r => r.json())
      .then((d: AnalyticsResponse) => {
        setData(d)
        setLoading(false)
      })
  }, [gran])

  // Derived active bar
  const activeIdx  = selectedBarIdx ?? (data?.periods.length ?? 1) - 1
  const activeBar  = data?.periods[activeIdx]
  const prevBar    = activeIdx > 0 ? data?.periods[activeIdx - 1] : undefined
  const isCurrentBar = !data || activeIdx === data.periods.length - 1
  const deltaRef   = DELTA_REF[gran]

  const deltaVsAnteriorIngresos = (prevBar && prevBar.ingresos > 0)
    ? ((activeBar!.ingresos - prevBar.ingresos) / prevBar.ingresos) * 100 : null
  const deltaVsAnteriorGastos = (prevBar && prevBar.gastos > 0)
    ? ((activeBar!.gastos - prevBar.gastos) / prevBar.gastos) * 100 : null

  const deltaVsAnioIngresos = (activeBar?.yoyIngresos != null && activeBar.yoyIngresos > 0)
    ? ((activeBar.ingresos - activeBar.yoyIngresos) / activeBar.yoyIngresos) * 100 : null
  const deltaVsAnioGastos = (activeBar?.yoyGastos != null && activeBar.yoyGastos > 0)
    ? ((activeBar.gastos - activeBar.yoyGastos) / activeBar.yoyGastos) * 100 : null

  return (
    <div>
      {/* Sticky header */}
      <div
        className="sticky top-0 z-50 flex items-center justify-between border-b border-border px-5 pb-3.5"
        style={{
          background: 'color-mix(in srgb, var(--background) 92%, transparent)',
          backdropFilter: 'blur(16px)',
          paddingTop: 52,
        }}
      >
        <span className="text-xl font-bold text-foreground">Análisis</span>
        <button
          onClick={() => setShowPicker(true)}
          className="flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5"
          style={{
            background: 'color-mix(in srgb, #6366f1 12%, transparent)',
            border: '1px solid color-mix(in srgb, #6366f1 27%, transparent)',
            color: '#6366f1',
          }}
        >
          <CalendarIcon />
          <span className="text-xs font-bold">{PERIOD_LABELS[gran]}</span>
          <span className="text-[10px] opacity-70">▾</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-4 px-5 py-3">
        {/* KPI row */}
        {loading || !activeBar ? (
          <div className="flex gap-2.5">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : (
          <div className="flex gap-2.5">
            <KpiCard
              type="ingresos"
              value={activeBar.ingresos}
              deltaVsAnterior={deltaVsAnteriorIngresos}
              deltaVsAnio={deltaVsAnioIngresos}
              deltaRef={deltaRef}
              activeLabel={activeBar.label}
              isCurrentBar={isCurrentBar}
            />
            <KpiCard
              type="gastos"
              value={activeBar.gastos}
              deltaVsAnterior={deltaVsAnteriorGastos}
              deltaVsAnio={deltaVsAnioGastos}
              deltaRef={deltaRef}
              activeLabel={activeBar.label}
              isCurrentBar={isCurrentBar}
            />
          </div>
        )}

        {/* Chart card */}
        {loading || !data ? (
          <CardSkeleton height={220} />
        ) : (
          <div style={{ background: 'var(--secondary)', borderRadius: 20, padding: 20 }}>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[15px] font-bold text-foreground">Evolución de gastos</span>
              <button
                onClick={() => setShowYoY(v => !v)}
                className="rounded-full px-2.5 py-1 text-[10px] font-bold transition-all"
                style={{
                  background: showYoY
                    ? 'color-mix(in srgb, #6366f1 12%, transparent)'
                    : 'var(--muted)',
                  border: showYoY
                    ? '1px solid color-mix(in srgb, #6366f1 44%, transparent)'
                    : '1px solid var(--border)',
                  color: showYoY ? '#6366f1' : 'var(--muted-foreground)',
                  cursor: 'pointer',
                }}
              >
                vs año ant.
              </button>
            </div>
            <DualBarChart
              allData={data.periods}
              selectedBarIdx={selectedBarIdx}
              onSelect={setSelectedBarIdx}
              showYoY={showYoY}
            />
          </div>
        )}

        {/* Savings card */}
        {loading || !activeBar ? (
          <CardSkeleton />
        ) : (
          <SavingsCard ingresos={activeBar.ingresos} ahorro={activeBar.ahorro} gran={gran} />
        )}
      </div>

      {showPicker && <GranPicker />}
    </div>
  )
}
