import { NextResponse } from 'next/server'
import { withUser, unwrap } from '@/lib/http/with-auth'

// Lista de notificaciones in-app del usuario para la campana del header (#177).
// RLS limita la consulta a las filas propias (auth.uid() = user_id). Se devuelven
// las más recientes (tope razonable para el sheet); el badge usa el endpoint
// /unread-count aparte.
const LIST_LIMIT = 30

// Corte de antigüedad del historial (#314): las leídas de más de RETENTION_DAYS
// dejan de mostrarse (las filas siguen en BD; es solo un filtro de lectura). Las
// no leídas se devuelven siempre, tengan la edad que tengan: /unread-count no
// aplica este corte y el badge nunca debe contar filas que la lista no muestre.
const RETENTION_DAYS = 30

export const GET = withUser('/api/notifications', async ({ supabase }) => {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 86_400_000).toISOString()
  const data = unwrap(
    await supabase
      .from('notifications')
      .select('id, source, kind, title, body, url, read_at, created_at')
      .or(`created_at.gte.${cutoff},read_at.is.null`)
      .order('created_at', { ascending: false })
      .limit(LIST_LIMIT),
    { op: 'list' }
  )

  return NextResponse.json({ notifications: data ?? [] })
})
