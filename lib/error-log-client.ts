/**
 * Telemetría de errores segura para el cliente (issues #200 y #303). Vive aparte
 * de `lib/error-log.ts`, que importa el service client de Supabase y es server-only.
 *
 * La consumen los dos error boundaries del App Router y el reporter global de
 * rechazos no capturados (`components/global-rejection-reporter.tsx`). El POST es
 * best-effort: si la ingesta falla no hay nada más que hacer, y jamás debe romper
 * el fallback.
 */

/**
 * Contexto del entorno que acompaña a todo aviso (#387). El fallo que motivó esto
 * —el service worker rechazando `respondWith` al reabrir la PWA en iOS— llegó a
 * `error_log` con `context: {}` y `stack: null`, sin nada con lo que saber qué
 * petición había fallado. Estos campos son los que distinguen un fallo de red
 * transitorio de un bug de renderizado.
 */
function environmentContext(): Record<string, unknown> {
  const ctx: Record<string, unknown> = {}
  if (typeof navigator !== 'undefined') {
    ctx.online = navigator.onLine
    ctx.ua = navigator.userAgent
    // Sin `controller` la página no está siendo servida por el service worker
    // (primera carga, o el SW murió): cambia por completo el diagnóstico.
    ctx.swController = Boolean(navigator.serviceWorker?.controller)
  }
  if (typeof document !== 'undefined') ctx.visibility = document.visibilityState
  if (typeof window !== 'undefined') {
    ctx.standalone = window.matchMedia?.('(display-mode: standalone)').matches ?? null
  }
  return ctx
}

export function reportClientError(
  error: Error & { digest?: string },
  context?: Record<string, unknown>
): void {
  fetch('/api/error-log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: error.message,
      stack: error.stack,
      route: window.location.pathname,
      // El `context` del llamante va último: puede pisar cualquier campo del entorno.
      context: {
        name: error.name,
        digest: error.digest,
        ...environmentContext(),
        ...context,
      },
    }),
  }).catch(() => {
    // best-effort: si la ingesta falla, no hay nada más que hacer
  })
}

/** Tope de avisos por carga de página: un fallo de red llega siempre en ráfaga. */
const MAX_REJECTIONS_PER_LOAD = 5

/**
 * Reporter de rechazos de promesa no capturados (#387).
 *
 * Ni React ni el App Router encaminan un `unhandledrejection` a un error boundary,
 * así que sin esto un `fetch` que falla sin `.catch()` no deja rastro en `error_log`
 * — que es justo lo que dejó el diagnóstico de #387 sin la URL que falló.
 *
 * Es una factoría en vez de un módulo con estado para que el tope y el dedupe sean
 * por instancia (y testeables sin resetear estado global). El dedupe va por mensaje:
 * cinco `fetch` cayendo a la vez por la misma razón son un aviso, no cinco.
 */
export function createRejectionReporter(): (reason: unknown) => void {
  let reported = 0
  const seen = new Set<string>()

  return function onUnhandledRejection(reason: unknown): void {
    const error =
      reason instanceof Error
        ? reason
        : new Error(typeof reason === 'string' ? reason : String(reason))

    if (reported >= MAX_REJECTIONS_PER_LOAD || seen.has(error.message)) return
    seen.add(error.message)
    reported += 1

    reportClientError(error, { scope: 'unhandledrejection' })
  }
}
