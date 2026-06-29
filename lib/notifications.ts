import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Notificaciones in-app (issue #177).
 *
 * Tabla genérica `notifications` con estado leído/no leído que alimenta la campana
 * del header (badge + lista). El primer productor son los fallos de scraper, que
 * llegan al webhook unificado `/api/scrapers/notify`; este módulo centraliza:
 *
 * - El catálogo de textos por `(source, kind)` — única fuente de verdad para el
 *   push (`PushPayload`) y la fila persistida.
 * - El insert con dedup ligera (`insertNotification`).
 */

/** Scrapers que pueden emitir notificaciones. */
export type NotificationSource = 'edenred' | 'sabadell_visa'
/**
 * Tipo de fallo. `session_expired`: sesión caducada; `2fa`: pide segundo factor;
 * `login_failed`: el login fue rechazado repetidamente sin pedir 2FA (posible
 * bloqueo blando anti-bot), distinto de una sesión caducada (#212).
 */
export type NotificationKind = 'session_expired' | '2fa' | 'login_failed'

export interface NotificationContent {
  title: string
  body: string
  /** Ruta a la que navegar al pulsar (la maneja el SW para el push). */
  url: string
}

/**
 * Catálogo de textos por scraper y tipo de fallo. Reúne los literales que antes
 * vivían dispersos en /api/edenred/notify-2fa y /api/sabadell-visa/notify-error.
 * `url` apunta a /accounts (la ruta real; los endpoints viejos apuntaban a la
 * /cuentas ya renombrada y por tanto rota).
 */
const CATALOG: Record<NotificationSource, Partial<Record<NotificationKind, NotificationContent>>> = {
  edenred: {
    session_expired: {
      title: 'Edenred: sesión caducada',
      body: 'Ejecuta «pnpm scrape:edenred:login» para regenerar la sesión.',
      url: '/accounts',
    },
    '2fa': {
      title: 'Edenred requiere 2FA',
      body: 'Ejecuta «pnpm scrape:edenred:login» para regenerar la sesión.',
      url: '/accounts',
    },
  },
  sabadell_visa: {
    session_expired: {
      title: 'Sabadell VISA: sesión caducada',
      body: 'Ejecuta «pnpm scrape:sabadell-visa:login» para re-enrolar el dispositivo.',
      url: '/accounts',
    },
    login_failed: {
      title: 'Sabadell VISA: login fallido',
      body: 'El acceso fue rechazado varias veces (posible bloqueo temporal). Reintenta más tarde o revisa las credenciales.',
      url: '/accounts',
    },
  },
}

/**
 * Devuelve el contenido del catálogo para `(source, kind)`, o `null` si la
 * combinación no está soportada (input inválido del webhook).
 */
export function resolveScraperNotification(
  source: string,
  kind: string
): NotificationContent | null {
  return CATALOG[source as NotificationSource]?.[kind as NotificationKind] ?? null
}

/** Ventana de deduplicación: no se repite una notificación no leída del mismo tipo. */
const DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000

export interface InsertNotificationInput extends NotificationContent {
  source: NotificationSource
  kind: NotificationKind
}

/**
 * Inserta una notificación para `userId` (service client, RLS sorteada).
 *
 * Dedup ligera: si ya existe una notificación **no leída** del mismo
 * `(source, kind)` en las últimas 24 h, no inserta otra y devuelve `false`. El
 * scraper ya limita a ~1 aviso/día por marker; esto es defensa en profundidad
 * para que el badge no crezca si la sesión sigue caducada varios días.
 *
 * Devuelve `true` si insertó, `false` si dedupó. Best-effort: ante error de BD
 * loguea y devuelve `false` (el llamante nunca debe romper por esto).
 */
export async function insertNotification(
  db: SupabaseClient,
  userId: string,
  input: InsertNotificationInput
): Promise<boolean> {
  const { source, kind, title, body, url } = input

  const since = new Date(Date.now() - DEDUPE_WINDOW_MS).toISOString()
  const { data: existing, error: dedupeError } = await db
    .from('notifications')
    .select('id')
    .eq('user_id', userId)
    .eq('source', source)
    .eq('kind', kind)
    .is('read_at', null)
    .gte('created_at', since)
    .limit(1)
    .maybeSingle()

  if (dedupeError) {
    console.error('[notifications] dedupe check:', dedupeError)
    return false
  }
  if (existing) return false

  const { error: insertError } = await db
    .from('notifications')
    .insert({ user_id: userId, source, kind, title, body, url })

  if (insertError) {
    console.error('[notifications] insert:', insertError)
    return false
  }
  return true
}
