import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logError } from '@/lib/error-log'

// Conteo de notificaciones no leídas para el badge de la campana (#177). Calco de
// /api/transactions/unread-count: el badge vive en el layout y no se recomputa con
// la navegación soft, así que el NotificationsProvider revalida contra este
// endpoint. RLS limita la consulta a las filas propias; `head: true` evita traer
// filas (solo el conteo, apoyado en el índice parcial de read_at IS NULL).
export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .is('read_at', null)

  if (error) {
    console.error('[GET /api/notifications/unread-count]', error)
    await logError({
      source: 'server',
      message: error.message,
      route: '/api/notifications/unread-count',
      context: { op: 'count', code: error.code },
      userId: user.id,
    })
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  return NextResponse.json({ count: count ?? 0 })
}
