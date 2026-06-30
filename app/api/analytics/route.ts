import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getHouseholdId } from '@/lib/household'
import { logError } from '@/lib/error-log'
import { buildAnalyticsResponse } from '@/lib/analytics'
import type { Granularity } from '@/types'

const VALID_GRANULARITY: Granularity[] = ['week', 'month', 'quarter', 'year']

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const granularity = searchParams.get('granularity') as Granularity
  const offset = parseInt(searchParams.get('offset') ?? '0', 10)

  if (!VALID_GRANULARITY.includes(granularity) || isNaN(offset) || offset < 0) {
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
    const data = await buildAnalyticsResponse(supabase, householdId, granularity, offset)
    return NextResponse.json(data)
  } catch (e) {
    console.error('[GET /api/analytics]', e)
    await logError({
      source: 'server',
      message: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack : null,
      route: '/api/analytics',
      context: { granularity, offset },
      userId: user.id,
      householdId,
    })
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }
}
