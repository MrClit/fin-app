import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import AnalyticsClient from '@/components/analytics/AnalyticsClient'
import { getCurrentUser, getCurrentHouseholdId, getRequestClient } from '@/lib/auth/session'
import { buildAnalyticsResponse, DEFAULT_GRANULARITY, parseGranularity } from '@/lib/analytics'

export const metadata: Metadata = { title: 'Análisis' }

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ g?: string }>
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const householdId = await getCurrentHouseholdId()
  if (!householdId) redirect('/login')

  const supabase = await getRequestClient()

  // Granularidad desde la URL (?g=) para que `initialData` coincida con la semilla
  // del provider; así la guarda anti-waterfall de AnalyticsClient sigue saltando el
  // fetch en el montaje (#235). Cae a la de por defecto si el param no es válido.
  const granularity = parseGranularity((await searchParams).g) ?? DEFAULT_GRANULARITY

  // Resuelve el período inicial en servidor (sin waterfall cliente, #235)
  const initialData = await buildAnalyticsResponse(supabase, householdId, granularity, 0)

  return <AnalyticsClient initialData={initialData} />
}
