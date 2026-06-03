import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getHouseholdId } from '@/lib/household'
import { getWindowPeriods, getYoYRange, toISODate } from '@/lib/analytics'
import type { Granularity, PeriodData, AnalyticsResponse } from '@/types'

const VALID_GRAN: Granularity[] = ['week', 'month', 'quarter', 'year']

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const gran = searchParams.get('gran') as Granularity
  const offset = parseInt(searchParams.get('offset') ?? '0', 10)

  if (!VALID_GRAN.includes(gran) || isNaN(offset) || offset < 0) {
    return NextResponse.json({ error: 'Invalid params' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const householdId = await getHouseholdId(supabase, user.id)
  if (!householdId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const window = getWindowPeriods(gran, offset)

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
        const hasYoy  = prevRow && (Number(prevRow.ingresos) > 0 || Number(prevRow.gastos) > 0)

        return {
          label:       range.label,
          start:       toISODate(range.start),
          end:         toISODate(range.end),
          ingresos:    Number(curRow?.ingresos   ?? 0),
          gastos:      Number(curRow?.gastos     ?? 0),
          ahorro:      Number(curRow?.ahorro     ?? 0),
          byCategory:  curRow?.by_category ?? [],
          yoyIngresos: hasYoy ? Number(prevRow.ingresos) : null,
          yoyGastos:   hasYoy ? Number(prevRow.gastos)   : null,
        }
      })
    )

    return NextResponse.json({ gran, periods } satisfies AnalyticsResponse)
  } catch (e) {
    console.error('[GET /api/analytics]', e)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }
}
