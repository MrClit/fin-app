import { z } from 'zod'

/**
 * Suscripción de push web (issue #115). `endpoint` es la URL del servicio de
 * push del navegador y actúa como identidad de la suscripción.
 */
export const pushSubscribeSchema = z.object({
  endpoint: z.url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
})

export const pushUnsubscribeSchema = z.object({
  endpoint: z.url(),
})
