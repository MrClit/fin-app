import { NextResponse } from 'next/server'
import { withUser, unwrap } from '@/lib/http/with-auth'

// Marca como leídas todas las notificaciones no leídas del usuario (#177). Lo
// llama la campana al abrir el sheet, dejando el badge a 0. RLS limita el UPDATE a
// las filas propias; añadimos el filtro explícito read_at IS NULL para no reescribir
// las ya leídas.
export const POST = withUser('/api/notifications/mark-read', async ({ supabase }) => {
  unwrap(
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .is('read_at', null),
    { op: 'mark-read' }
  )

  return NextResponse.json({ ok: true })
})
