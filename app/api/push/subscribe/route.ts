import { NextResponse } from 'next/server'
import { withAuth, unwrap } from '@/lib/http/with-auth'

/**
 * Guarda la PushSubscription del navegador para el usuario autenticado
 * (issue #115). Upsert por `endpoint`: re-suscribirse desde el mismo navegador
 * actualiza las claves en vez de duplicar la fila.
 */
export const POST = withAuth(
  '/api/push/subscribe',
  async ({ user, householdId, supabase }, request) => {
    const { endpoint, keys } = await request.json().catch(() => ({}))
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: 'Suscripción inválida' }, { status: 400 })
    }

    unwrap(
      await supabase
        .from('push_subscriptions')
        .upsert(
          { user_id: user.id, household_id: householdId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
          { onConflict: 'endpoint' }
        ),
      { op: 'upsert' }
    )

    return NextResponse.json({ ok: true })
  }
)
