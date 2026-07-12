/**
 * Telemetría de errores segura para el cliente (issues #200 y #303). Vive aparte
 * de `lib/error-log.ts`, que importa el service client de Supabase y es server-only.
 *
 * La consumen los dos error boundaries del App Router. El POST es best-effort:
 * si la ingesta falla no hay nada más que hacer, y jamás debe romper el fallback.
 */
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
      context: { digest: error.digest, ...context },
    }),
  }).catch(() => {
    // best-effort: si la ingesta falla, no hay nada más que hacer
  })
}
