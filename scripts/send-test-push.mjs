#!/usr/bin/env node
// Envía una notificación push de prueba a todas las suscripciones de un usuario.
// Sirve para validar el E2E de la issue #115 (aviso con la app cerrada).
//
// Uso:
//   node --env-file=.env.local scripts/send-test-push.mjs <user_id> [mensaje]
//
// Requiere en el entorno: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
// NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT.

import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

const [userId, ...rest] = process.argv.slice(2)
const message = rest.join(' ') || 'Notificación de prueba de Finanzas.'

if (!userId) {
  console.error('Uso: node --env-file=.env.local scripts/send-test-push.mjs <user_id> [mensaje]')
  process.exit(1)
}

const {
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY,
  VAPID_SUBJECT,
} = process.env

for (const [name, value] of Object.entries({
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY,
  VAPID_SUBJECT,
})) {
  if (!value) {
    console.error(`Falta la variable de entorno ${name}`)
    process.exit(1)
  }
}

webpush.setVapidDetails(VAPID_SUBJECT, NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

const db = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const { data: subs, error } = await db
  .from('push_subscriptions')
  .select('endpoint, p256dh, auth')
  .eq('user_id', userId)

if (error) {
  console.error('Error al leer suscripciones:', error.message)
  process.exit(1)
}
if (!subs || subs.length === 0) {
  console.error(`El usuario ${userId} no tiene suscripciones push.`)
  process.exit(1)
}

const payload = JSON.stringify({
  title: 'Finanzas — prueba',
  body: message,
  url: '/cuentas',
})

let ok = 0
for (const sub of subs) {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      payload,
    )
    ok++
    console.log('✓ enviado a', sub.endpoint.slice(0, 60) + '…')
  } catch (err) {
    console.error('✗ fallo en', sub.endpoint.slice(0, 60) + '…', '·', err.statusCode ?? err.message)
  }
}

console.log(`\n${ok}/${subs.length} notificaciones enviadas.`)
