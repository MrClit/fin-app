import { NextResponse } from 'next/server'
import { withUser, unwrap } from '@/lib/http/with-auth'

// Conteo de notificaciones no leídas para el badge de la campana (#177). Calco de
// /api/transactions/unread-count: el badge vive en el layout y no se recomputa con
// la navegación soft, así que el NotificationsProvider revalida contra este
// endpoint. RLS limita la consulta a las filas propias; `head: true` evita traer
// filas (solo el conteo, apoyado en el índice parcial de read_at IS NULL).
export const GET = withUser('/api/notifications/unread-count', async ({ supabase }) => {
  const res = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .is('read_at', null)

  unwrap(res, { op: 'count' })

  return NextResponse.json({ count: res.count ?? 0 })
})
