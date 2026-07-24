'use server'

import { actionError, withActionAuth } from '@/lib/actions/with-auth'
import type { ActionResult } from '@/lib/actions/with-auth'
import { descriptionKeys } from '@/lib/categories/normalize'
import { unwrap } from '@/lib/http/route-error'
import { narrowUnions } from '@/lib/supabase/rows'
import { uuidSchema } from '@/lib/schemas/common'
import { toIssues } from '@/lib/schemas/issues'
import {
  createTransactionSchema,
  updateTransactionSchema,
  type CreateTransactionBody,
  type UpdateTransactionBody,
} from '@/lib/schemas/transactions'
import type { Transaction, TransactionWithAccount } from '@/types'

/**
 * Mutaciones de movimientos como Server Actions (issue #311). Sustituyen a las
 * antiguas rutas POST /api/transactions y PATCH|DELETE /api/transactions/[id].
 *
 * Sin `revalidatePath`: el refresco tras mutar es estado local optimista en
 * cliente (`useTxMutations`) + paginación por cursor, y revalidar remontaría el
 * árbol RSC descartando páginas cargadas y estado optimista. Las acciones
 * devuelven la fila y el cliente sigue alimentando su estado local.
 *
 * Una Server Action es un endpoint público: los argumentos se revalidan siempre
 * con los esquemas de `lib/schemas/` aunque lleguen tipados.
 */

export const createTransaction = withActionAuth(
  'actions/transactions#createTransaction',
  async (
    { user, householdId, supabase },
    input: CreateTransactionBody
  ): Promise<ActionResult<TransactionWithAccount>> => {
    const parsed = createTransactionSchema.safeParse(input)
    if (!parsed.success) return actionError('invalid_input', toIssues(parsed.error))
    const { amount, description, date, category_manual, account_id } = parsed.data

    // Claves de comercio (#359): el alta manual es la otra puerta de entrada a
    // `transactions` además del núcleo de ingesta, y sus filas también deben poder
    // agruparse y aprenderse. `updateTransaction` no las toca porque su esquema no
    // deja editar la descripción.
    const { key, root } = descriptionKeys(description)

    const tx = unwrap(
      await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          household_id: householdId,
          account_id,
          amount,
          description,
          date,
          category_manual: category_manual ?? null,
          description_key: key,
          description_key_root: root,
          source: 'manual',
          // Un movimiento que crea el propio usuario no es una novedad que deba
          // notificarse: nace leído (issue #149). El DEFAULT false de la columna
          // solo aplica a los inserts de sincronización.
          is_read: true,
        })
        .select('*, account:accounts(id, name, color)')
        .single(),
      { op: 'insert' }
    )

    // `.single()` sin error garantiza fila; el `| null` del tipado no se da aquí.
    return { data: narrowUnions(tx!) as TransactionWithAccount }
  }
)

export const updateTransaction = withActionAuth(
  'actions/transactions#updateTransaction',
  async (
    { householdId, supabase },
    id: string,
    input: UpdateTransactionBody
  ): Promise<ActionResult<Transaction>> => {
    const parsedId = uuidSchema.safeParse(id)
    if (!parsedId.success) return actionError('invalid_input', toIssues(parsedId.error))
    // Update parcial: el esquema solo deja pasar los campos presentes, así que
    // se escriben tal cual (`category_manual: null` = "sin categoría").
    const parsed = updateTransactionSchema.safeParse(input)
    if (!parsed.success) return actionError('invalid_input', toIssues(parsed.error))

    const row = unwrap(
      await supabase
        .from('transactions')
        .update(parsed.data)
        .eq('id', id)
        .eq('household_id', householdId)
        .select()
        .single(),
      { op: 'update', id }
    )

    // `.single()` sin error garantiza fila; el `| null` del tipado no se da aquí.
    return { data: narrowUnions(row!) as Transaction }
  }
)

export const deleteTransaction = withActionAuth(
  'actions/transactions#deleteTransaction',
  async ({ householdId, supabase }, id: string): Promise<ActionResult<{ id: string }>> => {
    const parsedId = uuidSchema.safeParse(id)
    if (!parsedId.success) return actionError('invalid_input', toIssues(parsedId.error))

    // Sin unwrap: `single()` devuelve error cuando no hay fila y eso aquí es un
    // not_found, no un fallo de BD.
    const { data: tx } = await supabase
      .from('transactions')
      .select('source')
      .eq('id', id)
      .eq('household_id', householdId)
      .single()

    if (!tx) return actionError('not_found')
    if (tx.source !== 'manual') return actionError('imported_transaction')

    unwrap(
      await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
        .eq('household_id', householdId),
      { op: 'delete', id }
    )

    return { data: { id } }
  }
)
