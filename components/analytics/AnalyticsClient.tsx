'use client'

import { useEffect, useRef, useState } from 'react'
import type { AnalyticsResponse, Granularity } from '@/types'
import { useAnalytics } from './AnalyticsContext'
import { PERIOD_LABELS } from '@/lib/analytics'
import GranularityPicker from './GranularityPicker'
import PeriodVerdict from './PeriodVerdict'
import DualBarChart from './DualBarChart'
import CategoryBreakdownSection from './CategoryBreakdownSection'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

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
  return <Skeleton className="-mx-4 rounded-none border-y border-border md:mx-0 md:rounded-2xl md:border" style={{ height }} />
}

interface PageState {
  data: AnalyticsResponse | null
  selectedBarIdx: number | null
  showYoY: boolean
  /** El último fetch de período falló (sin red o SW sin respuesta, #387). */
  failed: boolean
}

export default function AnalyticsClient({ initialData }: { initialData: AnalyticsResponse }) {
  const { granularity } = useAnalytics()
  const [showPicker, setShowPicker] = useState(false)
  const [{ data, selectedBarIdx, showYoY, failed }, setPageState] = useState<PageState>({
    data: initialData, selectedBarIdx: null, showYoY: false, failed: false,
  })
  // Bumpea al reintentar: reejecuta el fetch aunque la granularidad no cambie.
  const [reloadKey, setReloadKey] = useState(0)

  // Los datos en mano sirven solo si son de la granularidad activa; si no, o están
  // en vuelo (loading) o el fetch falló (errored), nunca las dos cosas.
  const dataMatches = data !== null && data.granularity === granularity
  const loading = !dataMatches && !failed
  const errored = !dataMatches && failed

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
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((d: AnalyticsResponse) => {
        if (!cancelled) {
          setPageState({ data: d, selectedBarIdx: null, showYoY: false, failed: false })
        }
      })
      .catch(err => {
        // Sin red, o el SW no pudo responder (#387): estado de error explícito con
        // reintento. Sin este catch la pantalla se quedaba en skeleton para siempre.
        console.error('[AnalyticsClient] no se pudo cargar el período', err)
        if (!cancelled) setPageState(s => ({ ...s, failed: true }))
      })
    return () => { cancelled = true }
  }, [granularity, initialData.granularity, reloadKey])

  const retry = () => {
    setPageState(s => ({ ...s, failed: false }))
    setReloadKey(k => k + 1)
  }

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
    // `data-content="wide"` marca la pantalla como de rejilla: el app-shell ensancha su
    // columna a 960px desde `lg` (#366, #368). En `lg` el análisis pasa a dos columnas
    // equilibradas: ahorro+KPIs y gráfica a la izquierda, desglose por categoría a la derecha.
    <div data-content="wide">
      {/* Sticky header. El offset de 3rem esquiva la barra móvil del AppHeader (avatar +
          campana, `h-12`); en `md+` esa barra es `md:hidden` y el header de contenido queda
          a ~0px, así que el sticky se ancla sólo bajo la safe-area o taparía las gráficas. */}
      <div
        className="sticky top-[calc(env(safe-area-inset-top)+3rem)] z-30 border-b border-border px-4 pt-3 pb-3 md:top-[env(safe-area-inset-top)]"
        style={{
          background: 'color-mix(in srgb, var(--background) 92%, transparent)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-xl font-bold text-foreground">Análisis</span>
          <button
            onClick={() => setShowPicker(true)}
            className="flex cursor-pointer items-center gap-1.5 rounded-full border border-primary/27 bg-primary/12 px-3 py-1.5 text-primary transition-colors hover:bg-primary/20"
          >
            <CalendarIcon />
            <span className="text-xs font-bold">{PERIOD_LABELS[granularity]}</span>
            <span className="text-3xs opacity-70">▾</span>
          </button>
        </div>
        {/* Con el fetch caído `activeBar` sería de otro período: no lo anunciamos. */}
        {!errored && activeBar && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {formatDateRange(activeBar.start, activeBar.end)}
          </p>
        )}
      </div>

      {errored ? (
        <div className="px-4 py-3">
          <div className="-mx-4 flex flex-col items-start gap-3 border-y border-border bg-secondary px-4 py-6 md:mx-0 md:rounded-2xl md:border">
            <div className="flex flex-col gap-1">
              <span className="text-md font-bold text-foreground">
                No se pudo cargar el análisis
              </span>
              <span className="text-xs text-muted-foreground">
                Comprueba la conexión e inténtalo de nuevo.
              </span>
            </div>
            <button
              onClick={retry}
              className="cursor-pointer rounded-full border border-border bg-muted px-3 py-1.5 text-xs font-bold text-foreground transition-colors hover:bg-muted-foreground/15"
            >
              Reintentar
            </button>
          </div>
        </div>
      ) : (
      /* Content — en `lg` rejilla de dos columnas equilibradas: la pila ahorro+gráfica a
         la izquierda y el desglose a la derecha. En base todo se apila en orden. */
      <div className="grid gap-3 px-4 py-3 lg:grid-cols-2 lg:items-start">
        {/* Columna izquierda: veredicto del período + gráfica de barras */}
        <div className="flex flex-col gap-3">
        {/* Period verdict (ahorro + KPIs) */}
        {loading || !activeBar ? (
          <CardSkeleton height={290} />
        ) : (
          <PeriodVerdict
            income={activeBar.income}
            expense={activeBar.expense}
            savings={activeBar.savings}
            granularity={granularity}
            deltaVsPrevIncome={deltaVsPrevIncome}
            deltaVsYearIncome={deltaVsYearIncome}
            deltaVsPrevExpense={deltaVsPrevExpense}
            deltaVsYearExpense={deltaVsYearExpense}
            deltaRef={deltaRef}
          />
        )}

        {/* Chart card */}
        {loading || !data ? (
          <CardSkeleton height={220} />
        ) : (
          <div className="-mx-4 border-y border-border bg-secondary px-4 py-5 md:mx-0 md:rounded-2xl md:border">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-md font-bold text-foreground">Ingresos y gastos</span>
              <button
                onClick={toggleShowYoY}
                aria-pressed={showYoY}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-3xs font-bold transition-colors',
                  showYoY
                    ? 'border-primary/44 bg-primary/12 text-primary hover:bg-primary/20'
                    : 'border-border bg-muted text-muted-foreground hover:bg-muted-foreground/15'
                )}
                style={{ cursor: 'pointer' }}
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
        </div>

        {/* Category breakdown — segunda celda de la rejilla en `lg` */}
        {loading || !activeBar ? (
          <CardSkeleton height={420} />
        ) : (
          <CategoryBreakdownSection
            byCategory={activeBar.byCategory}
            income={activeBar.income}
            expense={activeBar.expense}
            periodStart={activeBar.start}
            granularity={granularity}
          />
        )}
      </div>
      )}

      <GranularityPicker open={showPicker} onOpenChange={setShowPicker} />
    </div>
  )
}
