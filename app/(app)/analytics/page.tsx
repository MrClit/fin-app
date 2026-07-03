import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import AnalyticsClient from '@/components/analytics/AnalyticsClient'
import { getCurrentUser, getCurrentHouseholdId, getRequestClient } from '@/lib/auth/session'
import { buildAnalyticsResponse, DEFAULT_GRANULARITY } from '@/lib/analytics'

export const metadata: Metadata = { title: 'Análisis' }

export default async function AnalyticsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const householdId = await getCurrentHouseholdId()
  if (!householdId) redirect('/login')

  const supabase = await getRequestClient()

  // Resuelve el período inicial en servidor (sin waterfall cliente, #235)
  const initialData = await buildAnalyticsResponse(supabase, householdId, DEFAULT_GRANULARITY, 0)

  return <AnalyticsClient initialData={initialData} />
}
