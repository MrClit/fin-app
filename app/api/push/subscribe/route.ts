import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, getCurrentHouseholdId, getRequestClient } from '@/lib/auth/session'

/**
 * Guarda la PushSubscription del navegador para el usuario autenticado
 * (issue #115). Upsert por `endpoint`: re-suscribirse desde el mismo navegador
 * actualiza las claves en vez de duplicar la fila.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const householdId = await getCurrentHouseholdId()
  if (!householdId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await getRequestClient()

  const { endpoint, keys } = await request.json().catch(() => ({}))
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: 'Suscripción inválida' }, { status: 400 })
  }

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      { user_id: user.id, household_id: householdId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
      { onConflict: 'endpoint' }
    )

  if (error) {
    console.error('[push/subscribe]', error)
    return NextResponse.json({ error: 'No se pudo guardar la suscripción' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
