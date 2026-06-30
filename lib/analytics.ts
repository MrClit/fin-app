import type { SupabaseClient } from '@supabase/supabase-js'
import type { Granularity, PeriodData, AnalyticsResponse } from '@/types'

export interface PeriodRange {
  start: Date
  end: Date
  label: string
}

// Granularidad inicial por defecto: fuente única compartida por el servidor
// (período inicial de Analítica) y el cliente (AnalyticsContext) para evitar drift.
export const DEFAULT_GRANULARITY: Granularity = 'month'

const WINDOW_SIZE: Record<Granularity, number> = {
  week: 9,
  month: 12,
  quarter: 10,
  year: 8,
}

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

// Semana lun–dom que contiene hoy, desplazada `offset` semanas atrás (§5.1)
function getWeekRange(offset: number): PeriodRange {
  const now = new Date()
  const dow = now.getDay() // 0=dom … 6=sab
  const daysToMonday = (dow + 6) % 7
  const monday = new Date(now)
  monday.setDate(now.getDate() - daysToMonday - offset * 7)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)

  const d = monday.getDate()
  const m = MONTH_LABELS[monday.getMonth()]
  const label = `${d} ${m}`

  return { start: monday, end: sunday, label }
}

function getMonthRange(offset: number): PeriodRange {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() - offset
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999)
  const label = MONTH_LABELS[((month % 12) + 12) % 12]
  return { start, end, label }
}

function getQuarterRange(offset: number): PeriodRange {
  const now = new Date()
  const totalMonths = now.getFullYear() * 12 + now.getMonth() - offset * 3
  const year = Math.floor(totalMonths / 12)
  const month = totalMonths % 12
  const q = Math.floor(month / 3)
  const startMonth = q * 3
  const start = new Date(year, startMonth, 1)
  const end = new Date(year, startMonth + 3, 0, 23, 59, 59, 999)
  const label = `Q${q + 1} ${year}`
  return { start, end, label }
}

function getYearRange(offset: number): PeriodRange {
  const year = new Date().getFullYear() - offset
  const start = new Date(year, 0, 1)
  const end = new Date(year, 11, 31, 23, 59, 59, 999)
  return { start, end, label: String(year) }
}

export function getPeriodRange(granularity: Granularity, offset: number): PeriodRange {
  switch (granularity) {
    case 'week':    return getWeekRange(offset)
    case 'month':   return getMonthRange(offset)
    case 'quarter': return getQuarterRange(offset)
    case 'year':    return getYearRange(offset)
  }
}

// Devuelve N rangos terminando en (período actual − offset), del más antiguo al más reciente
export function getWindowPeriods(granularity: Granularity, offset: number): PeriodRange[] {
  const n = WINDOW_SIZE[granularity]
  return Array.from({ length: n }, (_, i) => getPeriodRange(granularity, offset + (n - 1 - i)))
}

// Mismo rango pero −1 año (para comparativa YoY, §5.2)
export function getYoYRange(range: PeriodRange): PeriodRange {
  const start = new Date(range.start)
  const end = new Date(range.end)
  start.setFullYear(start.getFullYear() - 1)
  end.setFullYear(end.getFullYear() - 1)
  return { start, end, label: range.label }
}

// '+X%' / '-X%' / 'N/A' si previous === 0  (§5.2)
export function yoyDelta(current: number, previous: number): string {
  if (previous === 0) return 'N/A'
  const pct = ((current - previous) / previous) * 100
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(0)}%`
}

export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const PERIOD_LABELS: Record<Granularity, string> = {
  week:    'Semana',
  month:   'Mes',
  quarter: 'Trimestre',
  year:    'Año',
}

// Agrega la ventana de períodos de Analítica vía la RPC `get_period_data`
// (período actual + YoY). Recibe el cliente Supabase por parámetro para que el
// servidor (período inicial) y el endpoint `/api/analytics` (transiciones)
// compartan la misma lógica sin duplicarla y sin importar módulos server-only.
export async function buildAnalyticsResponse(
  supabase: SupabaseClient,
  householdId: string,
  granularity: Granularity,
  offset: number,
): Promise<AnalyticsResponse> {
  const window = getWindowPeriods(granularity, offset)

  const periods: PeriodData[] = await Promise.all(
    window.map(async (range) => {
      const yoy = getYoYRange(range)
      const [cur, prev] = await Promise.all([
        supabase.rpc('get_period_data', {
          p_household_id: householdId,
          p_start_date: toISODate(range.start),
          p_end_date:   toISODate(range.end),
        }),
        supabase.rpc('get_period_data', {
          p_household_id: householdId,
          p_start_date: toISODate(yoy.start),
          p_end_date:   toISODate(yoy.end),
        }),
      ])

      const curRow  = cur.data?.[0]
      const prevRow = prev.data?.[0]
      // §5.7: null cuando no hay transacciones del período del año anterior
      const hasYoy  = prevRow && (Number(prevRow.income) > 0 || Number(prevRow.expense) > 0)

      return {
        label:       range.label,
        start:       toISODate(range.start),
        end:         toISODate(range.end),
        income:    Number(curRow?.income   ?? 0),
        expense:      Number(curRow?.expense     ?? 0),
        savings:      Number(curRow?.savings     ?? 0),
        byCategory:  curRow?.by_category ?? [],
        yoyIncome: hasYoy ? Number(prevRow.income) : null,
        yoyExpense:   hasYoy ? Number(prevRow.expense)   : null,
      }
    })
  )

  return { granularity, periods }
}
