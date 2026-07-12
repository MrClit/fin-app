import { NextResponse } from 'next/server'
import { withUser, unwrap } from '@/lib/http/with-auth'
import { parseBody } from '@/lib/http/validation'
import { pushUnsubscribeSchema } from '@/lib/schemas/push'

/**
 * Elimina la PushSubscription del usuario autenticado por `endpoint`
 * (issue #115). La RLS ya garantiza que solo borra filas propias.
 */
export const POST = withUser('/api/push/unsubscribe', async ({ user, supabase }, request) => {
  const { endpoint } = await parseBody(request, pushUnsubscribeSchema)

  unwrap(
    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id)
      .eq('endpoint', endpoint),
    { op: 'delete' }
  )

  return NextResponse.json({ ok: true })
})
