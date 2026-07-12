import { NextRequest, NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { getCurrentUser, getCurrentHouseholdId, getRequestClient } from '@/lib/auth/session'
import { logError } from '@/lib/error-log'
import { RouteError } from '@/lib/http/route-error'

export { RouteError, unwrap } from '@/lib/http/route-error'

/**
 * Envoltorios de auth para route handlers (issue #305).
 *
 * Resuelven sesión, hogar y cliente Supabase, capturan cualquier excepción del
 * handler, la registran con `logError` y devuelven el 500. Así un handler solo
 * contiene su lógica: validar entrada, consultar, responder.
 *
 * La función devuelta conserva la firma `(request, ctx)` que Next espera: el
 * contexto de auth va como PRIMER argumento del handler, no de la ruta, y los
 * argumentos de Next (incluido `{ params }` de las rutas dinámicas) se pasan
 * detrás sin tocarlos.
 */

type Db = Awaited<ReturnType<typeof getRequestClient>>

export type UserContext = { user: User; supabase: Db }
export type AuthContext = UserContext & { householdId: string }

export type WithAuthOptions = {
  /** Respuesta alternativa al 401 por defecto (p. ej. redirigir a /login). */
  unauthorized?: (request: NextRequest) => Response
}

function unauthorized(request: NextRequest, options?: WithAuthOptions): Response {
  return (
    options?.unauthorized?.(request) ??
    NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  )
}

async function handleFailure(
  e: unknown,
  route: string,
  request: NextRequest,
  user: User,
  householdId: string | null
): Promise<Response> {
  console.error(`[${request.method} ${route}]`, e)
  // La query se registra siempre: es la entrada que reprodujo el fallo y ninguna
  // ruta debería tener que repetirla en el `context` de su error.
  const query = Object.fromEntries(request.nextUrl.searchParams)
  await logError({
    source: 'server',
    message: e instanceof Error ? e.message : String(e),
    stack: e instanceof Error ? e.stack : null,
    route,
    context: {
      method: request.method,
      ...(Object.keys(query).length > 0 ? { query } : undefined),
      ...(e instanceof RouteError ? e.context : undefined),
    },
    userId: user.id,
    householdId,
  })
  return NextResponse.json({ error: 'DB error' }, { status: 500 })
}

/** Route handler que exige sesión, sin resolver hogar. */
export function withUser<A extends unknown[]>(
  route: string,
  handler: (ctx: UserContext, request: NextRequest, ...rest: A) => Promise<Response>,
  options?: WithAuthOptions
): (request: NextRequest, ...rest: A) => Promise<Response> {
  return async (request, ...rest) => {
    const user = await getCurrentUser()
    if (!user) return unauthorized(request, options)

    const supabase = await getRequestClient()

    try {
      return await handler({ user, supabase }, request, ...rest)
    } catch (e) {
      return handleFailure(e, route, request, user, null)
    }
  }
}

/** Route handler que exige sesión y hogar. */
export function withAuth<A extends unknown[]>(
  route: string,
  handler: (ctx: AuthContext, request: NextRequest, ...rest: A) => Promise<Response>,
  options?: WithAuthOptions
): (request: NextRequest, ...rest: A) => Promise<Response> {
  return async (request, ...rest) => {
    const user = await getCurrentUser()
    if (!user) return unauthorized(request, options)

    const householdId = await getCurrentHouseholdId()
    if (!householdId) return unauthorized(request, options)

    const supabase = await getRequestClient()

    try {
      return await handler({ user, householdId, supabase }, request, ...rest)
    } catch (e) {
      return handleFailure(e, route, request, user, householdId)
    }
  }
}
