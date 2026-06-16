import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getHouseholdId } from '@/lib/household'
import { logError } from '@/lib/error-log'
import { getWindowPeriods, toISODate } from '@/lib/analytics'
import type { Granularity, CategoryId, CategoryAnalyticsResponse } from '@/types'
import { CATEGORY_META } from '@/lib/theme'

const VALID_GRANULARITY: Granularity[] = ['week', 'month', 'quarter', 'year']
const WINDOW = 6

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const granularity = searchParams.get('granularity') as Granularity
  const id   = searchParams.get('id') as CategoryId

  if (!VALID_GRANULARITY.includes(granularity) || !id || !(id in CATEGORY_META)) {
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
        const byCategory: { category: string | null; amount: number }[] = row?.by_category ?? []
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
  } catch (e) {
    console.error('[GET /api/analytics/category]', e)
    await logError({
      source: 'server',
      message: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack : null,
      route: '/api/analytics/category',
      context: { granularity, id },
      userId: user.id,
      householdId,
    })
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }
}
