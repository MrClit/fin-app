import { getAccountTransactions, type EBTransaction } from '@/lib/enablebanking'
import { toTransactionRow, upsertTransactions } from './rows'
import type { IngestDb, NormalizedTx } from './types'

/**
 * Ingesta desde Enable Banking (issue #331).
 *
 * A diferencia de los scrapers, que empujan un payload completo a un webhook, el
 * sync de EB es de tirón: las cuentas ya existen en la base de datos (las creó
 * `/api/banking/callback`, nunca el sync) y los movimientos se piden a la API de
 * EB cuenta a cuenta. Por eso no pasa por `./pipeline` — pero sí por el mismo
 * núcleo de escritura, `./rows`.
 *
 * Este módulo es lo que el sync manual (`/api/sync/enablebanking`) y el cron
 * tenían duplicado literal. Cada ruta conserva lo suyo: la sesión y el cooldown
 * uno, el barrido multi-hogar, el reporte de fallos y el aviso de caducidad el
 * otro.
 */

/** La cuenta como la necesita el sync, con las columnas que ambas rutas ya leen. */
export type EbSyncAccount = {
  id: string
  external_id: string | null
  session_id: string | null
  last_synced: string | null
}

/**
 * A quién se atribuyen los movimientos. Va aparte de la fila de cuenta a
 * propósito: el sync manual usa el usuario de la **sesión** y el cron el
 * `user_id` de la propia cuenta.
 */
export type EbSyncOwner = {
  userId: string
  householdId: string
}

/**
 * Devuelve el id de categoría de un movimiento, o `null` para dejarlo sin
 * categorizar. Más estrecho que el `Categorizer` del pipeline: aquí no hay
 * cuenta normalizada de la que colgar la decisión, porque la cuenta ya vive en
 * la base de datos.
 */
export type EbCategorizer = (tx: NormalizedTx) => string | null

export type EbSyncResult =
  | { ok: true; upserted: number }
  | { ok: false; error: string }

/** Descripción de un movimiento de EB, con la cascada de campos del proveedor. */
function describe(tx: EBTransaction): string {
  return (
    tx.remittance_information?.[0]?.trim() ||
    tx.creditor?.name ||
    tx.debtor?.name ||
    'Sin descripción'
  )
}

/** Traduce los movimientos de la API de EB al modelo normalizado de la ingesta. */
export function normalizeEbTransactions(transactions: EBTransaction[]): NormalizedTx[] {
  return transactions.map(tx => {
    // EB emite el importe siempre en positivo y el sentido en un campo aparte.
    const sign = tx.credit_debit_indicator === 'DBIT' ? -1 : 1
    const merchant = tx.creditor?.name ?? tx.debtor?.name ?? undefined
    return {
      // `entry_reference` es la referencia estable del banco; `transaction_id`
      // es el respaldo cuando no la trae.
      externalId: tx.entry_reference ?? tx.transaction_id ?? '',
      amount: parseFloat(tx.transaction_amount.amount) * sign,
      description: describe(tx),
      date: tx.booking_date,
      ...(merchant !== undefined && { merchant }),
    }
  })
}

/**
 * Saldo de la cuenta tras el último movimiento recibido, o `null` si EB no lo
 * emite (entonces no se toca el balance que ya hubiera en la fila).
 */
export function balanceFromEbTransactions(transactions: EBTransaction[]): number | null {
  const last = transactions.at(-1)
  return last?.balance_after_transaction
    ? parseFloat(last.balance_after_transaction.amount)
    : null
}

/**
 * Sincroniza UNA cuenta de Enable Banking: pide sus movimientos, los upsertea y
 * actualiza saldo y `last_synced`.
 *
 * `last_synced` sólo avanza si el upsert fue bien: es el `date_from` de la
 * siguiente petición a EB, así que avanzarlo tras un fallo perdería esos
 * movimientos para siempre (#331).
 */
export async function syncEbAccount(
  db: IngestDb,
  args: {
    account: EbSyncAccount
    owner: EbSyncOwner
    categorize: EbCategorizer
    /** Prefijo de los logs: '[sync/eb]' o '[sync/eb/cron]'. */
    tag: string
  }
): Promise<EbSyncResult> {
  const { account, owner, categorize, tag } = args

  // Cuenta sin conexión viva: no hay nada que pedirle a EB.
  if (!account.external_id || !account.session_id) return { ok: true, upserted: 0 }

  const dateFrom = account.last_synced ? account.last_synced.slice(0, 10) : undefined

  let ebTransactions: EBTransaction[]
  try {
    ebTransactions = await getAccountTransactions(
      account.external_id,
      account.session_id,
      dateFrom
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`${tag} getTransactions ${account.external_id}:`, message)
    return { ok: false, error: message }
  }

  const transactions = normalizeEbTransactions(ebTransactions)
  const rows = transactions.map(tx =>
    toTransactionRow(
      {
        userId: owner.userId,
        householdId: owner.householdId,
        accountId: account.id,
        source: 'enablebanking',
      },
      tx,
      // El categorizador recibe el movimiento entero: EB casa las reglas por
      // descripción y por comercio.
      categorize(tx)
    )
  )

  // `ignoreDuplicates: true`: un re-sync no debe pisar la edición manual que el
  // usuario haya hecho sobre un movimiento ya importado.
  const upsert = await upsertTransactions(db, rows, { tag, ignoreDuplicates: true })
  if (!upsert.ok) return { ok: false, error: upsert.error.message }

  const balance = balanceFromEbTransactions(ebTransactions)
  await db
    .from('accounts')
    .update({
      ...(balance !== null && { balance }),
      last_synced: new Date().toISOString(),
    })
    .eq('id', account.id)

  return { ok: true, upserted: upsert.upserted }
}
