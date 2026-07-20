import { z } from 'zod'
import type { NotificationSource } from '@/lib/notifications'
import { amountSchema, categoryIdSchema, isoDateSchema, isoDateTimeSchema } from './common'

/**
 * Payloads de los webhooks de scrapers (issue #308). Sustituyen a los type
 * guards `isValidPayload`/`isValidTx` que cada ruta mantenía a mano.
 *
 * Los tres scrapers viven en `scripts/scrapers/` y comparten la forma de un
 * movimiento, así que `scraperTxSchema` es la base común. Las divergencias que
 * había entre los guards (Edenred no exigía `external_id` no vacío ni importe
 * finito, Sabadell sí) eran accidentales: aquí quedan unificadas.
 */

/** Movimiento tal y como lo emite cualquiera de los tres scrapers. */
export const scraperTxSchema = z.object({
  external_id: z.string().min(1),
  amount: amountSchema,
  description: z.string(),
  transaction_date: isoDateSchema,
})

export const edenredPayloadSchema = z.object({
  balance: amountSchema,
  last_synced_at: isoDateTimeSchema,
  // El scraper de Edenred es el único que propone categoría (emite 'restaurant'
  // o 'payroll'); la ruta aplica 'restaurant' como fallback. Se valida contra el
  // catálogo (`categoryIdSchema`, derivado de `VALID_CATEGORIES`), no como string
  // libre: `transactions.category` tiene FK a `categories.id` (#174), así que un
  // id desconocido reventaba luego en la BD con un `500 DB error` opaco. Ahora es
  // un 400 con `path: ['transactions', N, 'category']` (#329).
  transactions: z.array(scraperTxSchema.extend({ category: categoryIdSchema.optional() })),
})
export type EdenredPayload = z.infer<typeof edenredPayloadSchema>

const sabadellCardSchema = z.object({
  // Identidad estable de la tarjeta: PAN enmascarado (p.ej. "4106________4014").
  card_id: z.string().min(1),
  name: z.string(),
  number: z.string().optional(),
  balance: amountSchema,
  transactions: z.array(scraperTxSchema),
})
export type SabadellCard = z.infer<typeof sabadellCardSchema>

export const sabadellVisaPayloadSchema = z.object({
  last_synced_at: isoDateTimeSchema,
  cards: z.array(sabadellCardSchema),
})
export type SabadellVisaPayload = z.infer<typeof sabadellVisaPayloadSchema>

const savingsAccountSchema = z.object({
  // `productCode` normalizado (p.ej. "32000007181690").
  account_id: z.string().min(1),
  name: z.string(),
  number: z.string().optional(),
  balance: amountSchema,
  transactions: z.array(scraperTxSchema),
})

export const sabadellSavingsPayloadSchema = z.object({
  last_synced_at: isoDateTimeSchema,
  account: savingsAccountSchema,
})
export type SabadellSavingsPayload = z.infer<typeof sabadellSavingsPayloadSchema>

/**
 * Aviso de fallo de scraper (`/api/scrapers/notify`). `source` decide con qué
 * secreto se autentica la petición, así que se valida antes del bearer.
 * `kind` se contrasta después contra el catálogo de `lib/notifications`.
 */
export const scraperNotifySchema = z.object({
  source: z.enum(
    ['edenred', 'sabadell_visa', 'sabadell_savings'] as const satisfies readonly NotificationSource[]
  ),
  kind: z.string().min(1),
})
