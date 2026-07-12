import { NextResponse } from 'next/server'
import { withUser, unwrap } from '@/lib/http/with-auth'

// Lista de notificaciones in-app del usuario para la campana del header (#177).
// RLS limita la consulta a las filas propias (auth.uid() = user_id). Se devuelven
// las más recientes (tope razonable para el sheet); el badge usa el endpoint
// /unread-count aparte.
const LIST_LIMIT = 30

export const GET = withUser('/api/notifications', async ({ supabase }) => {
  const data = unwrap(
    await supabase
      .from('notifications')
      .select('id, source, kind, title, body, url, read_at, created_at')
      .order('created_at', { ascending: false })
      .limit(LIST_LIMIT),
    { op: 'list' }
  )

  return NextResponse.json({ notifications: data ?? [] })
})
