import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { safeBearerMatch } from '@/lib/http/bearer'
import { sendPushToUser } from '@/lib/push'
import {
  insertNotification,
  resolveScraperNotification,
  type NotificationSource,
  type NotificationKind,
} from '@/lib/notifications'

/**
 * Webhook unificado de fallo de scraper (issue #177). Sustituye a los antiguos
 * /api/edenred/notify-2fa (#204) y /api/sabadell-visa/notify-error (#213).
 *
 * Los scrapers corren en local (launchd en el Mac); cuando un fallo requiere
 * intervención (sesión caducada o 2FA) hacen POST aquí con `{ source, kind }`.
 * El servidor:
 *   1. persiste una notificación in-app (tabla `notifications`, visible en la
 *      campana desde cualquier dispositivo aunque el push se pierda), y
 *   2. envía un push web firmado con VAPID (las claves nunca salen de Vercel).
 *
 * Auth por secreto compartido **según `source`**: cada scraper sigue usando su
 * propio secreto (el mismo de su webhook de datos), así que no hace falta una env
 * var nueva. El scraper garantiza ~1 aviso/día por marker; `insertNotification`
 * deduplica a mayores. Best-effort: el scraper es best-effort y no romperá su exit
 * code por la respuesta de este endpoint.
 */

/** Secreto compartido por scraper (el mismo del webhook de datos de cada uno). */
const SOURCE_SECRET_ENV: Record<NotificationSource, string> = {
  edenred: 'EDENRED_WEBHOOK_SECRET',
  sabadell_visa: 'SABADELL_VISA_WEBHOOK_SECRET',
}

export async function POST(req: Request) {
  let payload: { source?: unknown; kind?: unknown }
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { source, kind } = payload
  if (typeof source !== 'string' || typeof kind !== 'string') {
    return NextResponse.json({ error: 'Missing source/kind' }, { status: 400 })
  }

  const secretEnv = SOURCE_SECRET_ENV[source as NotificationSource]
  if (!secretEnv) {
    return NextResponse.json({ error: 'Unknown source' }, { status: 400 })
  }

  const secret = process.env[secretEnv]
  if (!secret) {
    console.error(`[scrapers/notify] ${secretEnv} no configurado`)
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  if (!safeBearerMatch(req.headers.get('authorization'), secret)) {
    return new NextResponse(null, { status: 401 })
  }

  const content = resolveScraperNotification(source, kind)
  if (!content) {
    return NextResponse.json({ error: 'Unknown source/kind' }, { status: 400 })
  }

  const db = createServiceClient()

  // App personal con un único hogar: el destinatario es el único registro de
  // user_config (mismo patrón que /api/edenred y /api/sabadell-visa).
  const { data: userRow, error: userErr } = await db
    .from('user_config')
    .select('user_id')
    .limit(1)
    .maybeSingle()
  if (userErr || !userRow?.user_id) {
    console.error('[scrapers/notify] no user_config:', userErr)
    return NextResponse.json({ error: 'No user configured' }, { status: 500 })
  }
  const userId = userRow.user_id as string

  // 1. Persistir la notificación in-app (con dedup). Independiente del push: si el
  //    usuario tiene el push desactivado, igualmente verá el aviso en la campana.
  const persisted = await insertNotification(db, userId, {
    source: source as NotificationSource,
    kind: kind as NotificationKind,
    ...content,
  })

  // 2. Enviar el push (inmediatez). sendPushToUser lanza si faltan las VAPID env
  //    vars; lo logueamos y seguimos: la persistencia ya quedó hecha.
  let sent = 0
  try {
    sent = await sendPushToUser(db, userId, content)
  } catch (err) {
    console.error('[scrapers/notify] push:', err)
  }

  return NextResponse.json({ persisted, sent })
}
