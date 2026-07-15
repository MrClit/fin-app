import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

/**
 * Modelo común de ingesta (issue #309).
 *
 * Los tres webhooks de scrapers (Edenred, Sabadell VISA, Sabadell ahorro) hacían
 * el mismo select→update/insert de cuenta + upsert de transacciones, cada uno con
 * su copia. Aquí vive la forma normalizada a la que cada conector traduce su
 * payload; el pipeline (`./pipeline`) hace el resto.
 */

/** Cliente service-role: los webhooks no tienen sesión, así que no hay RLS. */
export type IngestDb = SupabaseClient<Database>

/**
 * Cómo se localiza la cuenta dentro del hogar.
 *
 * Edenred identifica la suya por nombre (nunca tuvo `external_id`); Sabadell, por
 * `external_id` (el PAN enmascarado o el `productCode`), que tolera renombrados.
 * La divergencia se parametriza en vez de migrar los datos de Edenred.
 */
export type AccountIdentity =
  | { by: 'name'; value: string }
  | { by: 'external_id'; value: string }

/** Movimiento ya normalizado, sea cual sea el scraper que lo emitió. */
export type NormalizedTx = {
  externalId: string
  amount: number
  description: string
  /** YYYY-MM-DD */
  date: string
  /** Sugerencia del scraper. Sólo Edenred la emite. */
  category?: string
}

/**
 * Cuenta ya normalizada.
 *
 * Convenio de columnas opcionales: `undefined` significa «no emitir la columna en
 * el INSERT»; `null` significa «emitirla con valor NULL». Importa: normalizar aquí
 * un `number ?? null` metería `number: null` en el insert de Edenred, que hoy no lo
 * lleva.
 */
export type NormalizedAccount = {
  identity: AccountIdentity
  /** Sólo se emite en el INSERT: el nombre es propiedad de la BD y un re-sync no lo pisa (#313). */
  name: string
  type: string
  isLiability: boolean
  balance: number
  number?: string | null
  sortOrder?: number
  transactions: NormalizedTx[]
}

export type NormalizedPayload = {
  lastSyncedAt: string
  accounts: NormalizedAccount[]
}

/**
 * Devuelve el id de categoría de un movimiento, o `null` para dejarlo sin
 * categorizar. Es `string`, no `CategoryId`: Edenred persiste lo que emita su
 * scraper sin contrastarlo con el catálogo (la FK de `transactions.category` es
 * quien lo caza, #174).
 */
export type Categorizer = (tx: NormalizedTx, account: NormalizedAccount) => string | null

export type Connector<P> = {
  /** Prefijo de los logs: 'edenred' | 'sabadell-visa' | 'sabadell-savings'. */
  source: string
  normalize: (payload: P) => NormalizedPayload
  /**
   * Único punto asíncrono propio del conector, resuelto UNA vez por petición y
   * antes del bucle de cuentas. Sabadell VISA lo usa para precargar las reglas de
   * categorización del hogar; Edenred y ahorro devuelven una clausura síncrona y
   * NO tocan la base de datos.
   */
  prepareCategorizer: (db: IngestDb, householdId: string) => Categorizer | Promise<Categorizer>
}

export type IngestError = { code: 'no_owner' } | { code: 'db_error' }

export type IngestOutcome =
  | { ok: true; data: { accounts: number; createdAccounts: number; upserted: number } }
  | { ok: false; error: IngestError }
