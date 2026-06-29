import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logError } from '@/lib/error-log'

// Lista de notificaciones in-app del usuario para la campana del header (#177).
// RLS limita la consulta a las filas propias (auth.uid() = user_id). Se devuelven
// las más recientes (tope razonable para el sheet); el badge usa el endpoint
// /unread-count aparte.
const LIST_LIMIT = 30

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('notifications')
    .select('id, source, kind, title, body, url, read_at, created_at')
    .order('created_at', { ascending: false })
    .limit(LIST_LIMIT)

  if (error) {
    console.error('[GET /api/notifications]', error)
    await logError({
      source: 'server',
      message: error.message,
      route: '/api/notifications',
      context: { op: 'list', code: error.code },
      userId: user.id,
    })
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  return NextResponse.json({ notifications: data ?? [] })
}
