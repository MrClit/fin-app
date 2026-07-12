import { z } from 'zod'
import { VALID_CATEGORIES } from '@/lib/categories'
import type { CategoryId } from '@/types'

/**
 * Piezas compartidas por los esquemas de payload (issue #308).
 */

/** Id de categoría. Se deriva del catálogo (`lib/categories/catalog.ts`). */
export const categoryIdSchema = z.enum(
  VALID_CATEGORIES as readonly [CategoryId, ...CategoryId[]]
)

/** Fecha de calendario `YYYY-MM-DD`, tal y como se guarda en `transactions.date`. */
export const isoDateSchema = z.iso.date()

/** Instante ISO 8601 (lo que produce `new Date().toISOString()`). */
export const isoDateTimeSchema = z.iso.datetime()

/**
 * Id de fila. Se valida la FORMA (8-4-4-4-12 hex), no la versión: `z.uuid()`
 * comprueba además los bits de versión/variante del RFC 9562, y eso no aporta
 * nada aquí — lo que queremos descartar es un `"abc"`, no un UUID válido de otra
 * versión que Postgres aceptaría igual.
 */
export const uuidSchema = z.guid()

/**
 * Importe en euros. El signo solo es presentación: la clasificación
 * income/expense la determina la categoría, así que aquí no se restringe.
 * Zod v4 ya rechaza `NaN` e `Infinity` en `z.number()`.
 */
export const amountSchema = z.number()
