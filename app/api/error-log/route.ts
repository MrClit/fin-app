import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getHouseholdId } from '@/lib/household'
import { logError } from '@/lib/error-log'

/**
 * Endpoint de ingesta de errores de cliente (issue #200). Lo invocan los error
 * boundaries del App Router (`app/error.tsx`, `app/global-error.tsx`).
 *
 * Es deliberadamente tolerante a la ausencia de sesión: un error puede ocurrir en
 * una pantalla sin usuario autenticado y aun así queremos registrarlo. Si hay
 * sesión, se adjuntan `user_id` y `household_id` como contexto.
 */
export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const { message, stack, route, context } = body as Record<string, unknown>

  if (typeof message !== 'string' || message.trim() === '') {
    return NextResponse.json({ error: 'Missing message' }, { status: 400 })
  }

  // Resolver usuario/hogar de forma best-effort: nunca bloquea el registro.
  let userId: string | null = null
  let householdId: string | null = null
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      userId = user.id
      householdId = await getHouseholdId(supabase, user.id)
    }
  } catch {
    // sin sesión / cookies no disponibles: registramos igualmente
  }

  await logError({
    source: 'client',
    message,
    stack: typeof stack === 'string' ? stack : null,
    route: typeof route === 'string' ? route : null,
    context: context && typeof context === 'object' ? (context as Record<string, unknown>) : null,
    userId,
    householdId,
  })

  return NextResponse.json({ ok: true })
}
