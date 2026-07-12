import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/http/with-auth'
import { buildAnalyticsResponse } from '@/lib/analytics'
import type { Granularity } from '@/types'

const VALID_GRANULARITY: Granularity[] = ['week', 'month', 'quarter', 'year']

export const GET = withAuth('/api/analytics', async ({ supabase, householdId }, request) => {
  const { searchParams } = request.nextUrl
  const granularity = searchParams.get('granularity') as Granularity
  const offset = parseInt(searchParams.get('offset') ?? '0', 10)

  if (!VALID_GRANULARITY.includes(granularity) || isNaN(offset) || offset < 0) {
    return NextResponse.json({ error: 'Invalid params' }, { status: 400 })
  }

  const data = await buildAnalyticsResponse(supabase, householdId, granularity, offset)
  return NextResponse.json(data)
})
