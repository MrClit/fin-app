'use server'

import { withUserAction } from '@/lib/actions/with-auth'
import type { ActionResult } from '@/lib/actions/with-auth'
import { unwrap } from '@/lib/http/route-error'

// Marca como leídas todas las notificaciones no leídas del usuario (#177). La
// llama la campana al abrir el sheet, dejando el badge a 0. RLS limita el UPDATE
// a las filas propias; el filtro explícito read_at IS NULL evita reescribir las
// ya leídas. Sustituye a la antigua ruta POST /api/notifications/mark-read (#311).
export const markAllNotificationsRead = withUserAction(
  'actions/notifications#markAllNotificationsRead',
  async ({ supabase }): Promise<ActionResult<null>> => {
    unwrap(
      await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .is('read_at', null),
      { op: 'mark-read' }
    )

    return { data: null }
  }
)
