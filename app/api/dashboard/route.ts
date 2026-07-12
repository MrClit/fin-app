import { NextResponse } from 'next/server'
import { withUser } from '@/lib/http/with-auth'
import { getDashboardData } from '@/lib/dashboard'

export const GET = withUser('/api/dashboard', async () => {
  const data = await getDashboardData()
  return NextResponse.json(data)
})
