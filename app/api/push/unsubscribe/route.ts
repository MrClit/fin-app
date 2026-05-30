import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Elimina la PushSubscription del usuario autenticado por `endpoint`
 * (issue #115). La RLS ya garantiza que solo borra filas propias.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { endpoint } = await request.json().catch(() => ({}))
  if (!endpoint) {
    return NextResponse.json({ error: 'endpoint es obligatorio' }, { status: 400 })
  }

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', user.id)
    .eq('endpoint', endpoint)

  if (error) {
    console.error('[push/unsubscribe]', error)
    return NextResponse.json({ error: 'No se pudo eliminar la suscripción' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
