/**
 * Error de handler que transporta contexto extra para `logError`, y el helper que
 * desenvuelve un `{ data, error }` de Supabase.
 *
 * Viven aparte de `with-auth.ts` porque las funciones de datos de `lib/` los usan
 * y ese módulo importa `next/server` y la sesión (server-only): un client component
 * que importe un helper puro de `lib/transactions.ts` arrastraría toda esa cadena.
 * `with-auth.ts` los reexporta, así que los route handlers no cambian de import.
 */

type PostgrestLike = { message: string; code?: string }

export class RouteError extends Error {
  constructor(
    message: string,
    readonly context?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'RouteError'
  }
}

/**
 * Desenvuelve un `{ data, error }` de Supabase. Si hay error lanza un `RouteError`
 * con el `code` de Postgrest, para que el envoltorio lo registre y devuelva el 500.
 */
export function unwrap<T>(
  result: { data: T; error: PostgrestLike | null },
  context?: Record<string, unknown>
): T {
  if (result.error) {
    throw new RouteError(result.error.message, { ...context, code: result.error.code })
  }
  return result.data
}
