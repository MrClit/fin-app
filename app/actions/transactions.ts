'use server'

import { actionError, withActionAuth } from '@/lib/actions/with-auth'
import type { ActionResult } from '@/lib/actions/with-auth'
import { descriptionKeys } from '@/lib/categories/normalize'
import { getRequestClient } from '@/lib/auth/session'
import { MIN_CONFIDENCE } from '@/lib/categories'
import { unwrap } from '@/lib/http/route-error'
import { narrowUnions } from '@/lib/supabase/rows'
import { categoryIdSchema, uuidSchema } from '@/lib/schemas/common'
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

/**
 * Aplicación retroactiva de una corrección (issue #359).
 *
 * Cuando el usuario recategoriza un movimiento, el resto de movimientos del mismo
 * comercio siguen como estaban. Estas dos acciones son las que permiten ofrecerle
 * arreglarlos de un toque: la primera cuenta cuántos hay, la segunda los cambia.
 *
 * INVARIANTE: se escribe en `category` y sólo sobre filas con `category_manual IS
 * NULL`. Una escritura automática —y esto lo es, aunque la dispare un gesto del
 * usuario— jamás puede pisar una decisión humana anterior sobre OTRO movimiento.
 * El `.is('category_manual', null)` de ambas consultas es ese invariante escrito
 * en código.
 */

/** Alcance de la comparación: por qué columna y con qué valor se buscan los similares. */
export type SimilarTransactions = {
  count: number
  /** Valor de la clave que agrupa (`mercadona` o `mercadona sant boi`). */
  key: string
  /** Qué columna casa: `root` agrupa el comercio en todas sus ciudades. */
  level: 'exact' | 'root'
  /** La clave en mayúsculas, para el mensaje de la UI. */
  label: string
}

type SimilarScope = { column: 'description_key' | 'description_key_root'; value: string }

/**
 * Resuelve contra qué clave se buscan los similares de un movimiento.
 *
 * Se prefiere la raíz porque es donde está el valor —corregir un Mercadona
 * arregla los de todas las ciudades—, **pero sólo si el histórico del hogar
 * respalda que esa raíz significa esa categoría**. Sin esa comprobación, una
 * única corrección atípica bastaba para ofrecer reescribir decenas de filas sin
 * relación: sobre los datos reales del hogar, corregir un movimiento cuya raíz
 * era el topónimo `prat` proponía cambiar 69 movimientos repartidos entre siete
 * categorías, y un Mercadona marcado como Restaurante proponía cambiar 82.
 *
 * Es el mismo estándar de evidencia que aplica el aprendizaje
 * (`MIN_CONFIDENCE`), y por el mismo motivo: una raíz que no predice categoría no
 * debe arrastrar a nadie. Cuando la raíz no supera el listón se cae a la clave
 * exacta, que sigue siendo útil y es inofensiva.
 *
 * `null` = descriptor sin señal, no hay nada que agrupar. Las claves se leen de la
 * fila, no se recalculan del texto: son las que se indexaron al escribirlas.
 */
async function resolveSimilarScope(
  supabase: Awaited<ReturnType<typeof getRequestClient>>,
  householdId: string,
  id: string,
  categoryId: string
): Promise<SimilarScope | null> {
  const { data } = await supabase
    .from('transactions')
    .select('description_key, description_key_root')
    .eq('id', id)
    .eq('household_id', householdId)
    .single()

  if (!data) return null

  const exact: SimilarScope | null = data.description_key
    ? { column: 'description_key', value: data.description_key }
    : null
  const root = data.description_key_root
  if (!root) return exact

  // Voto de las correcciones humanas que ya existen bajo esa raíz. Incluye la
  // recién hecha (esta acción corre después del update), así que el total nunca
  // es cero y una raíz estrenada arranca con acuerdo 1,0 — que es lo que hace que
  // el primer Mercadona corregido sí arregle todos los demás.
  const { data: votes } = await supabase
    .from('transactions')
    .select('category_manual')
    .eq('household_id', householdId)
    .eq('description_key_root', root)
    .not('category_manual', 'is', null)

  const total = votes?.length ?? 0
  const agree = votes?.filter(v => v.category_manual === categoryId).length ?? 0
  const agreement = total === 0 ? 0 : agree / total

  return agreement >= MIN_CONFIDENCE ? { column: 'description_key_root', value: root } : exact
}

/**
 * Cuántos movimientos del hogar cambiarían si se aplicase `categoryId` a todo el
 * comercio. Devuelve `count: 0` cuando no hay nada que ofrecer.
 *
 * Se excluyen los que ya tienen esa categoría: el número que se le enseña al
 * usuario es el de filas que realmente van a cambiar, no el del comercio entero.
 */
export const countSimilarTransactions = withActionAuth(
  'actions/transactions#countSimilarTransactions',
  async (
    { householdId, supabase },
    id: string,
    categoryId: string
  ): Promise<ActionResult<SimilarTransactions>> => {
    const parsedId = uuidSchema.safeParse(id)
    if (!parsedId.success) return actionError('invalid_input', toIssues(parsedId.error))
    const parsedCategory = categoryIdSchema.safeParse(categoryId)
    if (!parsedCategory.success) return actionError('invalid_input', toIssues(parsedCategory.error))

    const scope = await resolveSimilarScope(supabase, householdId, id, parsedCategory.data)
    if (!scope) return { data: { count: 0, key: '', level: 'exact', label: '' } }

    // `head: true` no trae filas, sólo el conteo (mismo patrón que
    // `getUnreadCount`); `unwrap` se usa aquí por su throw, y el count se lee del
    // resultado, que es donde lo deja PostgREST.
    const res = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('household_id', householdId)
      .eq(scope.column, scope.value)
      .is('category_manual', null)
      .neq('id', id)
      .or(`category.is.null,category.neq.${parsedCategory.data}`)
    unwrap(res, { op: 'count-similar', id })

    return {
      data: {
        count: res.count ?? 0,
        key: scope.value,
        level: scope.column === 'description_key_root' ? 'root' : 'exact',
        label: scope.value.toUpperCase(),
      },
    }
  }
)

/**
 * Aplica la categoría al resto de movimientos del mismo comercio.
 *
 * El alcance se vuelve a resolver en el servidor a partir del id, en vez de
 * aceptar la clave que mande el cliente: así una Server Action —que es un
 * endpoint público— no permite pedir «cámbiame todas las filas que casen con
 * esto».
 */
export const applyCategoryToSimilar = withActionAuth(
  'actions/transactions#applyCategoryToSimilar',
  async (
    { householdId, supabase },
    id: string,
    categoryId: string
  ): Promise<ActionResult<{ updated: number }>> => {
    const parsedId = uuidSchema.safeParse(id)
    if (!parsedId.success) return actionError('invalid_input', toIssues(parsedId.error))
    const parsedCategory = categoryIdSchema.safeParse(categoryId)
    if (!parsedCategory.success) return actionError('invalid_input', toIssues(parsedCategory.error))

    const scope = await resolveSimilarScope(supabase, householdId, id, parsedCategory.data)
    if (!scope) return { data: { updated: 0 } }

    const rows = unwrap(
      await supabase
        .from('transactions')
        .update({ category: parsedCategory.data })
        .eq('household_id', householdId)
        .eq(scope.column, scope.value)
        .is('category_manual', null)
        .neq('id', id)
        .or(`category.is.null,category.neq.${parsedCategory.data}`)
        .select('id'),
      { op: 'apply-similar', id }
    )

    return { data: { updated: rows?.length ?? 0 } }
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
