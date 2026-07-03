import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { getDashboardData } from '@/lib/dashboard'
import { logError } from '@/lib/error-log'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const data = await getDashboardData()
    return NextResponse.json(data)
  } catch (e) {
    console.error('[GET /api/dashboard]', e)
    await logError({
      source: 'server',
      message: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack : null,
      route: '/api/dashboard',
      userId: user.id,
    })
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }
}
