/**
 * Rate-limit en memoria por ventana fija. Usado por rutas públicas que escriben
 * con service role y no tienen sesión que las proteja (p. ej. `/api/error-log`,
 * issue #233).
 *
 * Es defensa best-effort consciente: en Vercel serverless el estado vive en cada
 * instancia y se resetea en cold start, así que NO es un límite distribuido —
 * basta para mitigar ráfagas de spam en una app personal sin añadir Redis/Upstash.
 */

type Bucket = { count: number; resetAt: number }

const DEFAULT_LIMIT = 20
const DEFAULT_WINDOW_MS = 60_000

// Cota dura del número de claves vivas para que el Map no crezca sin límite ante
// un atacante que rote IPs. Al alcanzarla se purga lo expirado y, si aún así está
// lleno, se descarta la entrada más antigua.
const MAX_KEYS = 10_000

const buckets = new Map<string, Bucket>()

export type RateLimitResult = { ok: boolean; retryAfter: number }

export function rateLimit(
  key: string,
  opts: { limit?: number; windowMs?: number } = {}
): RateLimitResult {
  const limit = opts.limit ?? DEFAULT_LIMIT
  const windowMs = opts.windowMs ?? DEFAULT_WINDOW_MS
  const now = Date.now()

  pruneExpired(now)

  let bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    if (!buckets.has(key) && buckets.size >= MAX_KEYS) evictOldest()
    bucket = { count: 0, resetAt: now + windowMs }
    buckets.set(key, bucket)
  }

  bucket.count++
  if (bucket.count > limit) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) }
  }
  return { ok: true, retryAfter: 0 }
}

function pruneExpired(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

function evictOldest(): void {
  let oldestKey: string | null = null
  let oldestReset = Infinity
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < oldestReset) {
      oldestReset = bucket.resetAt
      oldestKey = key
    }
  }
  if (oldestKey !== null) buckets.delete(oldestKey)
}

/** Sólo para tests: vacía el estado entre casos. */
export function __resetRateLimit(): void {
  buckets.clear()
}

/**
 * Resuelve la IP del cliente desde las cabeceras de proxy. Vercel setea
 * `x-real-ip`; como fallback se toma el primer valor de `x-forwarded-for`.
 * Devuelve `'unknown'` si no hay ninguna (las peticiones sin IP comparten cubo).
 */
export function clientIp(request: Request): string {
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp.trim()

  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }

  return 'unknown'
}
