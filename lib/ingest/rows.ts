import type { PostgrestError } from '@supabase/supabase-js'
import type { TablesInsert } from '@/lib/supabase/database.types'
import { descriptionKeys } from '@/lib/categories/normalize'
import type { IngestDb, IngestSource, NormalizedTx } from './types'

/**
 * Núcleo de escritura de movimientos (issue #331).
 *
 * Todo movimiento que entra en la app pasa por aquí, venga de un webhook de
 * scraper (a través de `./pipeline`) o de una sincronización con Enable Banking
 * (a través de `./enablebanking`). Centraliza la forma de la fila y el destino
 * del upsert; lo que cada camino decide, `source` e `ignoreDuplicates`, son
 * parámetros y no literales escondidos.
 */

export type TxRowContext = {
  userId: string
  householdId: string
  accountId: string
  source: IngestSource
}

/**
 * `is_read` se omite a propósito (issue #149): un insert nuevo toma el DEFAULT
 * false (nace "no leído") y, en el camino que sí actualiza las filas existentes
 * (`ignoreDuplicates: false`), no emitirla evita que un re-sync reescriba el
 * estado de lectura de un movimiento ya leído.
 *
 * Las claves de comercio (#359) se derivan aquí y no en cada conector: éste es el
 * cuello de botella único por el que pasan los tres scrapers y Enable Banking, así
 * que basta con calcularlas una vez para que todo lo que entra en la app quede
 * agrupable. Se calculan siempre desde `description`, nunca desde `merchant` —ver
 * `learnedProvider` en `lib/categories/categorizer.ts`—.
 */
export function toTransactionRow(
  ctx: TxRowContext,
  tx: NormalizedTx,
  category: string | null
): TablesInsert<'transactions'> {
  const { key, root } = descriptionKeys(tx.description)
  return {
    user_id: ctx.userId,
    household_id: ctx.householdId,
    account_id: ctx.accountId,
    date: tx.date,
    amount: tx.amount,
    description: tx.description,
    category,
    source: ctx.source,
    external_id: tx.externalId,
    description_key: key,
    description_key_root: root,
  }
}

export type UpsertResult =
  | { ok: true; upserted: number }
  | { ok: false; error: PostgrestError }

/**
 * Inserta o actualiza movimientos contra la clave natural
 * `(household_id, external_id)`.
 *
 * `ignoreDuplicates` no es cosmético: decide si un re-sync **pisa** la fila que
 * ya existe. Los scrapers reescriben (`false`) porque su payload es la verdad
 * más reciente del banco; Enable Banking no (`true`), para no deshacer una
 * edición manual del usuario sobre un movimiento ya importado. Cada llamante
 * declara el suyo.
 */
export async function upsertTransactions(
  db: IngestDb,
  rows: TablesInsert<'transactions'>[],
  options: { tag: string; ignoreDuplicates: boolean }
): Promise<UpsertResult> {
  if (rows.length === 0) return { ok: true, upserted: 0 }

  const { error } = await db.from('transactions').upsert(rows, {
    onConflict: 'household_id,external_id',
    ignoreDuplicates: options.ignoreDuplicates,
  })

  if (error) {
    console.error(`${options.tag} upsert transactions:`, error)
    return { ok: false, error }
  }

  return { ok: true, upserted: rows.length }
}
