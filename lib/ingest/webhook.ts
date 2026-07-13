import { NextResponse } from 'next/server'
import type { ZodType, z } from 'zod'
import { safeBearerMatch } from '@/lib/http/bearer'
import { badRequest, readJson } from '@/lib/http/validation'
import type { IngestError } from './types'

/**
 * Preámbulo común de los webhooks de scrapers (issue #309): secreto configurado,
 * bearer válido y body conforme al esquema. Los tres pasos que los tres handlers
 * repetían antes de tocar la base de datos.
 */

export type WebhookGuard<T> =
  | { ok: true; payload: T }
  | { ok: false; response: NextResponse }

export async function webhookGuard<S extends ZodType>(
  request: Request,
  options: {
    /** Prefijo de los logs. */
    source: string
    /** Nombre de la variable de entorno, sólo para el log. */
    secretName: string
    /**
     * Valor del secreto. Se pasa por valor (y no el nombre) para que la ruta
     * escriba `process.env.X` literal: Next necesita el acceso estático.
     */
    secret: string | undefined
    schema: S
  }
): Promise<WebhookGuard<z.infer<S>>> {
  if (!options.secret) {
    console.error(`[${options.source}] ${options.secretName} no configurado`)
    return {
      ok: false,
      response: NextResponse.json({ error: 'Server misconfigured' }, { status: 500 }),
    }
  }

  if (!safeBearerMatch(request.headers.get('authorization'), options.secret)) {
    return { ok: false, response: new NextResponse(null, { status: 401 }) }
  }

  const parsed = options.schema.safeParse(await readJson(request))
  if (!parsed.success) return { ok: false, response: badRequest(parsed.error) }

  return { ok: true, payload: parsed.data }
}

/** Traduce el fallo del pipeline a la respuesta que los scrapers ya esperan. */
export function ingestErrorResponse(error: IngestError): NextResponse {
  const message = error.code === 'no_owner' ? 'No user configured' : 'DB error'
  return NextResponse.json({ error: message }, { status: 500 })
}
