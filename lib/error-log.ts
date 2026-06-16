import { createServiceClient } from '@/lib/supabase/service'

/**
 * Observabilidad de errores (issue #200).
 *
 * Registra un fallo en la tabla `error_log` de Supabase con contexto suficiente
 * para revisarlo después por el SQL Editor. La inserción usa el service role, que
 * se salta RLS, de modo que el error se registra siempre, incluso sin sesión ni
 * hogar resoluble.
 *
 * `logError` es fire-and-forget y NUNCA lanza: un fallo al registrar jamás debe
 * romper la petición que lo originó.
 */

export type LogErrorParams = {
  source: 'client' | 'server'
  message: string
  stack?: string | null
  route?: string | null
  context?: Record<string, unknown> | null
  userId?: string | null
  householdId?: string | null
}

// Límites defensivos: evitar que un stack o un context enormes inflen la tabla.
const MAX_STACK = 8_000
const MAX_MESSAGE = 2_000

function truncate(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value
}

export async function logError(params: LogErrorParams): Promise<void> {
  try {
    const db = createServiceClient()
    const { error } = await db.from('error_log').insert({
      source: params.source,
      message: truncate(params.message, MAX_MESSAGE),
      stack: params.stack ? truncate(params.stack, MAX_STACK) : null,
      route: params.route ?? null,
      context: params.context ?? null,
      user_id: params.userId ?? null,
      household_id: params.householdId ?? null,
    })
    if (error) {
      console.error('[logError] no se pudo registrar el error', error)
    }
  } catch (e) {
    console.error('[logError] no se pudo registrar el error', e)
  }
}
