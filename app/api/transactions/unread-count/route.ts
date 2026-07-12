import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/http/with-auth'
import { getUnreadCount } from '@/lib/transactions'

// Conteo de movimientos no leídos para refrescar el badge de la tabBar sin
// recargar la página. El #149 calculaba el count solo en el server component del
// layout; en una PWA (sobre todo iOS) reabrir desde segundo plano no lo
// re-ejecuta, así que el badge se quedaba con un valor obsoleto. El
// `UnreadProvider` consulta este endpoint al volver a primer plano
// (visibilitychange).
export const GET = withAuth('/api/transactions/unread-count', async ({ supabase, householdId }) => {
  const count = await getUnreadCount(supabase, householdId)
  return NextResponse.json({ count })
})
