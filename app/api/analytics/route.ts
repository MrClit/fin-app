import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, getCurrentHouseholdId, getRequestClient } from '@/lib/auth/session'
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

  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const householdId = await getCurrentHouseholdId()
  if (!householdId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await getRequestClient()

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
