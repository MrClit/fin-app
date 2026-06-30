import { redirect } from 'next/navigation'
import AnalyticsClient from '@/components/analytics/AnalyticsClient'
import { createClient } from '@/lib/supabase/server'
import { getHouseholdId } from '@/lib/household'
import { buildAnalyticsResponse, DEFAULT_GRANULARITY } from '@/lib/analytics'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const householdId = await getHouseholdId(supabase, user.id)
  if (!householdId) redirect('/login')

  // Resuelve el período inicial en servidor (sin waterfall cliente, #235)
  const initialData = await buildAnalyticsResponse(supabase, householdId, DEFAULT_GRANULARITY, 0)

  return <AnalyticsClient initialData={initialData} />
}
