import { NextResponse } from 'next/server'
import type { ZodError, ZodType, z } from 'zod'
import { toIssues } from '@/lib/schemas/issues'

/**
 * Validación de bodies con Zod (issue #308).
 *
 * Dos formas sobre la misma respuesta 400, según cómo esté envuelta la ruta:
 *
 * - `parseBody` LANZA `BadRequest`, que `withAuth`/`withUser` traducen al 400.
 *   Es la forma declarativa para las rutas con sesión: el handler escribe
 *   `const { amount } = await parseBody(request, createTransactionSchema)` y ya
 *   trabaja con datos tipados.
 * - `readJson` + `badRequest` para las rutas que no van envueltas (los webhooks
 *   de scrapers, que se autentican por bearer y no tienen sesión).
 */

export type { ValidationIssue } from '@/lib/schemas/issues'

/**
 * Lee el body como JSON. Un body ausente, vacío o ilegible se resuelve a
 * `undefined` en vez de lanzar: es el esquema quien decide si eso es un error
 * (la mayoría) o un caso válido (`/api/sync/enablebanking`, con body opcional).
 */
export async function readJson(request: Request): Promise<unknown> {
  return request.json().catch(() => undefined)
}

/** El 400 de validación. `error` se mantiene por compatibilidad con los clientes. */
export function badRequest(error?: ZodError): NextResponse {
  return NextResponse.json(
    { error: 'Invalid body', ...(error && { issues: toIssues(error) }) },
    { status: 400 }
  )
}

/** Body inválido. `withAuth`/`withUser` lo convierten en 400 en vez de en 500. */
export class BadRequest extends Error {
  constructor(readonly zodError?: ZodError) {
    super('Invalid body')
    this.name = 'BadRequest'
  }

  toResponse(): NextResponse {
    return badRequest(this.zodError)
  }
}

/** Lee y valida el body. Lanza `BadRequest` si no cumple el esquema. */
export async function parseBody<S extends ZodType>(
  request: Request,
  schema: S
): Promise<z.infer<S>> {
  const result = schema.safeParse(await readJson(request))
  if (!result.success) throw new BadRequest(result.error)
  return result.data
}
