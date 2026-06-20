import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { safeBearerMatch } from '@/lib/http/bearer'
import { sendPushToUser } from '@/lib/push'

/**
 * Webhook que dispara un push "Sabadell VISA: sesión caducada" (issue #213).
 *
 * El scraper corre en local (launchd en el Mac); cuando un fallo de sesión
 * (exit 2: OTP / login fallido) requiere intervención, hace POST aquí para que el
 * push se firme en el servidor (las claves VAPID nunca salen de Vercel). El propio
 * scraper garantiza un único aviso por día atándolo al marker
 * `sabadell-visa-notified.<fecha>`, así que este endpoint no deduplica: simplemente
 * envía a las suscripciones del usuario.
 *
 * Auth por secreto compartido (`SABADELL_VISA_WEBHOOK_SECRET`, el mismo del webhook
 * de datos /api/sabadell-visa). No lleva body. Réplica de /api/edenred/notify-2fa.
 */
export async function POST(req: Request) {
  const secret = process.env.SABADELL_VISA_WEBHOOK_SECRET
  if (!secret) {
    console.error('[sabadell-visa/notify-error] SABADELL_VISA_WEBHOOK_SECRET no configurado')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  if (!safeBearerMatch(req.headers.get('authorization'), secret)) {
    return new NextResponse(null, { status: 401 })
  }

  const db = createServiceClient()

  // App personal con un único hogar: el usuario destinatario es el único registro
  // de user_config (mismo patrón que /api/sabadell-visa).
  const { data: userRow, error: userErr } = await db
    .from('user_config')
    .select('user_id')
    .limit(1)
    .maybeSingle()
  if (userErr || !userRow?.user_id) {
    console.error('[sabadell-visa/notify-error] no user_config:', userErr)
    return NextResponse.json({ error: 'No user configured' }, { status: 500 })
  }

  try {
    const sent = await sendPushToUser(db, userRow.user_id as string, {
      title: 'Sabadell VISA: sesión caducada',
      body: 'Ejecuta «pnpm scrape:sabadell-visa:login» para re-enrolar el dispositivo.',
      url: '/cuentas',
    })
    return NextResponse.json({ sent })
  } catch (err) {
    // sendPushToUser lanza si faltan las VAPID env vars. No debe tumbar el aviso
    // de forma silenciosa: lo logueamos y devolvemos 500 (el scraper es
    // best-effort y no romperá su exit code por esto).
    console.error('[sabadell-visa/notify-error] push:', err)
    return NextResponse.json({ error: 'Push failed' }, { status: 500 })
  }
}
