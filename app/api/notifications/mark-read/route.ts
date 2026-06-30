import { NextResponse } from 'next/server'
import { getCurrentUser, getRequestClient } from '@/lib/auth/session'
import { logError } from '@/lib/error-log'

// Marca como leídas todas las notificaciones no leídas del usuario (#177). Lo
// llama la campana al abrir el sheet, dejando el badge a 0. RLS limita el UPDATE a
// las filas propias; añadimos el filtro explícito read_at IS NULL para no reescribir
// las ya leídas.
export async function POST() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const supabase = await getRequestClient()

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .is('read_at', null)

  if (error) {
    console.error('[POST /api/notifications/mark-read]', error)
    await logError({
      source: 'server',
      message: error.message,
      route: '/api/notifications/mark-read',
      context: { op: 'mark-read', code: error.code },
      userId: user.id,
    })
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
