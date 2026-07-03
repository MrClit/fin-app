import { NextResponse } from 'next/server'
import { getCurrentUser, getCurrentHouseholdId, getRequestClient } from '@/lib/auth/session'
import { logError } from '@/lib/error-log'

// Conteo de movimientos no leídos para refrescar el badge de la tabBar sin
// recargar la página. El #149 calculaba el count solo en el server component del
// layout; en una PWA (sobre todo iOS) reabrir desde segundo plano no lo
// re-ejecuta, así que el badge se quedaba con un valor obsoleto. El
// `UnreadProvider` consulta este endpoint al volver a primer plano
// (visibilitychange). RLS limita la consulta al hogar del usuario; `head: true`
// evita traer filas (solo el conteo, apoyado en el índice parcial de #149).
export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const householdId = await getCurrentHouseholdId()
  if (!householdId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await getRequestClient()

  const { count, error } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('is_read', false)

  if (error) {
    console.error('[GET /api/transactions/unread-count]', error)
    await logError({
      source: 'server',
      message: error.message,
      route: '/api/transactions/unread-count',
      context: { op: 'count', code: error.code },
      userId: user.id,
      householdId,
    })
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  return NextResponse.json({ count: count ?? 0 })
}
