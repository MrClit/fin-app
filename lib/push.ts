import webpush from 'web-push'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getConsentStatus } from '@/lib/accounts'

// Re-exportado por conveniencia; el cliente debe importarlo de '@/lib/push-client'
// para no arrastrar web-push (Node-only) al bundle del navegador.
export { urlBase64ToUint8Array } from '@/lib/push-client'

/**
 * Lógica de notificaciones push (Web Push API, issue #115).
 *
 * - Envío firmado con VAPID desde servidor (`sendPushToUser`), podando
 *   suscripciones muertas.
 * - Selección de cuentas con consentimiento PSD2 a punto de caducar
 *   (`selectAccountsToNotify`), helper puro reutilizado por el cron y los tests.
 * - Conversión de la clave VAPID pública para `pushManager.subscribe`
 *   (`urlBase64ToUint8Array`), compartida con el cliente.
 */

export interface PushPayload {
  title: string
  body: string
  /** Ruta a la que navegar al pulsar la notificación (la maneja el SW). */
  url: string
}

let vapidConfigured = false

/**
 * Configura las claves VAPID en `web-push` una sola vez por proceso. Lanza si
 * faltan las variables de entorno (el llamante decide cómo degradar).
 */
function ensureVapidConfigured(): void {
  if (vapidConfigured) return
  const subject = process.env.VAPID_SUBJECT
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!subject || !publicKey || !privateKey) {
    throw new Error('VAPID env vars no configuradas (VAPID_SUBJECT / *_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY)')
  }
  webpush.setVapidDetails(subject, publicKey, privateKey)
  vapidConfigured = true
}

interface SubscriptionRow {
  endpoint: string
  p256dh: string
  auth: string
}

/**
 * Envía `payload` a todas las suscripciones del usuario. Las suscripciones que
 * el push service reporta como caducadas (404/410 Gone) se eliminan de la BD.
 * Devuelve cuántos envíos tuvieron éxito.
 */
export async function sendPushToUser(
  db: SupabaseClient,
  userId: string,
  payload: PushPayload
): Promise<number> {
  ensureVapidConfigured()

  const { data: subs, error } = await db
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId)

  if (error) {
    console.error('[push] fetch subscriptions:', error)
    return 0
  }
  if (!subs || subs.length === 0) return 0

  const body = JSON.stringify(payload)
  const gone: string[] = []
  let sent = 0

  await Promise.all(
    (subs as SubscriptionRow[]).map(async sub => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body
        )
        sent++
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode
        if (statusCode === 404 || statusCode === 410) {
          gone.push(sub.endpoint)
        } else {
          console.error('[push] sendNotification:', err)
        }
      }
    })
  )

  if (gone.length > 0) {
    await db.from('push_subscriptions').delete().in('endpoint', gone)
  }

  return sent
}

export interface NotifiableAccount {
  id: string
  user_id: string
  name: string
  consent_expires_at: string | null
  consent_reminder_sent_for: string | null
}

/**
 * Filtra las cuentas cuyo consentimiento PSD2 está en estado `critical`
 * (caduca pronto, spec §9.2) y para las que aún no se ha enviado el aviso de
 * este ciclo de caducidad (`consent_reminder_sent_for !== consent_expires_at`).
 */
export function selectAccountsToNotify(accounts: NotifiableAccount[]): NotifiableAccount[] {
  return accounts.filter(account => {
    const { status } = getConsentStatus(account.consent_expires_at)
    if (status !== 'critical') return false
    return account.consent_reminder_sent_for !== account.consent_expires_at
  })
}
