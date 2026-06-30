'use client'

import { useEffect, useRef, useState } from 'react'
import type { AnalyticsResponse, Granularity } from '@/types'
import { useAnalytics } from '@/contexts/AnalyticsContext'
import { PERIOD_LABELS } from '@/lib/analytics'
import GranularityPicker from './GranularityPicker'
import SavingsCard from './SavingsCard'
import KpiCard from './KpiCard'
import DualBarChart from './DualBarChart'
import CategoryBreakdownSection from './CategoryBreakdownSection'
import { Skeleton } from '@/components/ui/skeleton'

const DELTA_REF: Record<Granularity, string> = {
  week:    'vs sem. anterior',
  month:   'vs mes anterior',
  quarter: 'vs trimestre ant.',
  year:    'vs año anterior',
}

const MONTH_SHORT = ['ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.', 'jul.', 'ago.', 'sep.', 'oct.', 'nov.', 'dic.']

function formatDateRange(start: string, end: string): string {
  const s = new Date(start + 'T00:00:00')
  const e = new Date(end   + 'T00:00:00')
  const sd = s.getDate(), sm = MONTH_SHORT[s.getMonth()], sy = s.getFullYear()
  const ed = e.getDate(), em = MONTH_SHORT[e.getMonth()], ey = e.getFullYear()
  if (sy !== ey) return `${sd} ${sm} ${sy} - ${ed} ${em} ${ey}`
  return `${sd} ${sm} - ${ed} ${em} ${sy}`
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
  return <Skeleton className="-mx-4 rounded-none border-y border-border" style={{ height }} />
}

interface PageState {
  data: AnalyticsResponse | null
  selectedBarIdx: number | null
  showYoY: boolean
}

export default function AnalyticsClient({ initialData }: { initialData: AnalyticsResponse }) {
  const { granularity, setShowPicker } = useAnalytics()
  const [{ data, selectedBarIdx, showYoY }, setPageState] = useState<PageState>({
    data: initialData, selectedBarIdx: null, showYoY: false,
  })

  // Derived: loading when data hasn't arrived yet or belongs to a different granularity
  const loading = !data || data.granularity !== granularity

  const setSelectedBarIdx = (idx: number) =>
    setPageState(s => ({ ...s, selectedBarIdx: idx }))
  const toggleShowYoY = () =>
    setPageState(s => ({ ...s, showYoY: !s.showYoY }))

  // El período inicial ya viene resuelto del servidor: solo se hace fetch en las
  // transiciones posteriores de granularidad, no en el montaje (#235).
  const isFirst = useRef(true)
  useEffect(() => {
    if (isFirst.current && granularity === initialData.granularity) {
      isFirst.current = false
      return
    }
    isFirst.current = false
    let cancelled = false
    fetch(`/api/analytics?granularity=${granularity}&offset=0`)
      .then(r => r.json())
      .then((d: AnalyticsResponse) => {
        if (!cancelled) setPageState({ data: d, selectedBarIdx: null, showYoY: false })
      })
    return () => { cancelled = true }
  }, [granularity, initialData.granularity])

  // Derived active bar
  const activeIdx = selectedBarIdx ?? (data?.periods.length ?? 1) - 1
  const activeBar = data?.periods[activeIdx]
  const prevBar   = activeIdx > 0 ? data?.periods[activeIdx - 1] : undefined
  const deltaRef  = DELTA_REF[granularity]

  const deltaVsPrevIncome = (prevBar && prevBar.income > 0)
    ? ((activeBar!.income - prevBar.income) / prevBar.income) * 100 : null
  const deltaVsPrevExpense = (prevBar && prevBar.expense > 0)
    ? ((activeBar!.expense - prevBar.expense) / prevBar.expense) * 100 : null

  const deltaVsYearIncome = (activeBar?.yoyIncome != null && activeBar.yoyIncome > 0)
    ? ((activeBar.income - activeBar.yoyIncome) / activeBar.yoyIncome) * 100 : null
  const deltaVsYearExpense = (activeBar?.yoyExpense != null && activeBar.yoyExpense > 0)
    ? ((activeBar.expense - activeBar.yoyExpense) / activeBar.yoyExpense) * 100 : null

  return (
    <div>
      {/* Sticky header */}
      <div
        className="sticky z-30 border-b border-border px-4 pt-3 pb-3"
        style={{
          top: 'calc(env(safe-area-inset-top) + 3rem)',
          background: 'color-mix(in srgb, var(--background) 92%, transparent)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <div className="flex items-center justify-between">
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
            <span className="text-xs font-bold">{PERIOD_LABELS[granularity]}</span>
            <span className="text-[10px] opacity-70">▾</span>
          </button>
        </div>
        {activeBar && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {formatDateRange(activeBar.start, activeBar.end)}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col gap-3 px-4 py-3">
        {/* KPI row */}
        {loading || !activeBar ? (
          <CardSkeleton />
        ) : (
          <div className="-mx-4 flex border-y border-border bg-secondary px-4 py-5">
            <div className="flex-1 pr-4">
              <KpiCard
                type="income"
                value={activeBar.income}
                deltaVsPrev={deltaVsPrevIncome}
                deltaVsYear={deltaVsYearIncome}
                deltaRef={deltaRef}
              />
            </div>
            <div className="flex-1 border-l border-border pl-4">
              <KpiCard
                type="expense"
                value={activeBar.expense}
                deltaVsPrev={deltaVsPrevExpense}
                deltaVsYear={deltaVsYearExpense}
                deltaRef={deltaRef}
              />
            </div>
          </div>
        )}

        {/* Chart card */}
        {loading || !data ? (
          <CardSkeleton height={220} />
        ) : (
          <div className="-mx-4 border-y border-border bg-secondary px-4 py-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[15px] font-bold text-foreground">Ingresos y gastos</span>
              <button
                onClick={toggleShowYoY}
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

        {/* Category breakdown */}
        {loading || !activeBar ? (
          <CardSkeleton height={420} />
        ) : (
          <CategoryBreakdownSection byCategory={activeBar.byCategory} periodStart={activeBar.start} />
        )}

        {/* Savings card */}
        {loading || !activeBar ? (
          <CardSkeleton />
        ) : (
          <SavingsCard income={activeBar.income} savings={activeBar.savings} granularity={granularity} />
        )}
      </div>

      <GranularityPicker />
    </div>
  )
}
