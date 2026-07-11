import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/http/with-auth'
import { getWindowPeriods, toISODate } from '@/lib/analytics'
import type { Granularity, CategoryId, CategoryAnalyticsResponse } from '@/types'
import { CATEGORY_META } from '@/lib/theme'

const VALID_GRANULARITY: Granularity[] = ['week', 'month', 'quarter', 'year']
const WINDOW = 6

export const GET = withAuth(
  '/api/analytics/category',
  async ({ supabase, householdId }, request) => {
    const { searchParams } = request.nextUrl
    const granularity = searchParams.get('granularity') as Granularity
    const id   = searchParams.get('id') as CategoryId

    if (!VALID_GRANULARITY.includes(granularity) || !id || !(id in CATEGORY_META)) {
      return NextResponse.json({ error: 'Invalid params' }, { status: 400 })
    }

    const allPeriods = getWindowPeriods(granularity, 0)
    const window = allPeriods.slice(-WINDOW)

    const periods = await Promise.all(
      window.map(async (range) => {
        const { data } = await supabase.rpc('get_period_data', {
          p_household_id: householdId,
          p_start_date:   toISODate(range.start),
          p_end_date:     toISODate(range.end),
        })
        const row = data?.[0]
        // `by_category` es jsonb (get_period_data lo agrega con json_agg), así que
        // el tipo generado es `Json`; se asserta a su forma conocida.
        const byCategory =
          (row?.by_category ?? []) as { category: string | null; amount: number }[]
        const match = byCategory.find(bc => bc.category === id)
        return {
          label:  range.label,
          start:  toISODate(range.start),
          end:    toISODate(range.end),
          amount: match ? Math.abs(Number(match.amount)) : 0,
        }
      })
    )

    return NextResponse.json({
      granularity,
      categoryId: id,
      periods,
    } satisfies CategoryAnalyticsResponse)
  }
)
