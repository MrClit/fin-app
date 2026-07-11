import { NextResponse } from 'next/server'
import { withAuth, unwrap } from '@/lib/http/with-auth'

// Conteo de movimientos no leídos para refrescar el badge de la tabBar sin
// recargar la página. El #149 calculaba el count solo en el server component del
// layout; en una PWA (sobre todo iOS) reabrir desde segundo plano no lo
// re-ejecuta, así que el badge se quedaba con un valor obsoleto. El
// `UnreadProvider` consulta este endpoint al volver a primer plano
// (visibilitychange). RLS limita la consulta al hogar del usuario; `head: true`
// evita traer filas (solo el conteo, apoyado en el índice parcial de #149).
export const GET = withAuth('/api/transactions/unread-count', async ({ supabase }) => {
  const res = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('is_read', false)

  unwrap(res, { op: 'count' })

  return NextResponse.json({ count: res.count ?? 0 })
})
