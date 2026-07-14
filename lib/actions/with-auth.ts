import type { User } from '@supabase/supabase-js'
import { getCurrentUser, getCurrentHouseholdId, getRequestClient } from '@/lib/auth/session'
import { logError } from '@/lib/error-log'
import { RouteError } from '@/lib/http/route-error'
import type { AuthContext, UserContext } from '@/lib/http/with-auth'
import type { ValidationIssue } from '@/lib/schemas/issues'

/**
 * Envoltorios de auth para Server Actions (issue #311), espejo de los de route
 * handlers (`lib/http/with-auth.ts`, #305): resuelven sesión, hogar y cliente
 * Supabase, capturan cualquier excepción de la acción y la registran con
 * `logError`. Así una acción solo contiene su lógica: validar entrada, mutar,
 * devolver el resultado.
 *
 * Viven fuera de `app/actions/` porque un fichero `'use server'` solo puede
 * exportar funciones async, no envoltorios ni tipos.
 *
 * A diferencia de las rutas no hay códigos de estado HTTP hacia fuera, y Next
 * ofusca en producción los errores lanzados dentro de una acción; el contrato de
 * error viaja como valor de retorno serializable (`ActionResult`) y el cliente
 * discrimina con `res.error`. Un throw solo llega al cliente por fallo de
 * transporte (p. ej. offline).
 */

export type ActionErrorCode =
  | 'unauthorized'
  | 'invalid_input'
  | 'not_found'
  | 'imported_transaction'
  | 'server_error'

export type ActionError = { code: ActionErrorCode; issues?: ValidationIssue[] }

export type ActionResult<T> =
  | { data: T; error?: never }
  | { data?: never; error: ActionError }

export function actionError(
  code: ActionErrorCode,
  issues?: ValidationIssue[]
): { error: ActionError } {
  return { error: issues ? { code, issues } : { code } }
}

async function handleFailure(
  e: unknown,
  action: string,
  user: User,
  householdId: string | null
): Promise<{ error: ActionError }> {
  console.error(`[${action}]`, e)
  await logError({
    source: 'server',
    message: e instanceof Error ? e.message : String(e),
    stack: e instanceof Error ? e.stack : null,
    route: action,
    context: e instanceof RouteError ? e.context : undefined,
    userId: user.id,
    householdId,
  })
  return actionError('server_error')
}

/** Server Action que exige sesión, sin resolver hogar. */
export function withUserAction<A extends unknown[], T>(
  action: string,
  fn: (ctx: UserContext, ...args: A) => Promise<ActionResult<T>>
): (...args: A) => Promise<ActionResult<T>> {
  return async (...args) => {
    const user = await getCurrentUser()
    if (!user) return actionError('unauthorized')

    const supabase = await getRequestClient()

    try {
      return await fn({ user, supabase }, ...args)
    } catch (e) {
      return handleFailure(e, action, user, null)
    }
  }
}

/** Server Action que exige sesión y hogar. */
export function withActionAuth<A extends unknown[], T>(
  action: string,
  fn: (ctx: AuthContext, ...args: A) => Promise<ActionResult<T>>
): (...args: A) => Promise<ActionResult<T>> {
  return async (...args) => {
    const user = await getCurrentUser()
    if (!user) return actionError('unauthorized')

    const householdId = await getCurrentHouseholdId()
    if (!householdId) return actionError('unauthorized')

    const supabase = await getRequestClient()

    try {
      return await fn({ user, householdId, supabase }, ...args)
    } catch (e) {
      return handleFailure(e, action, user, householdId)
    }
  }
}
