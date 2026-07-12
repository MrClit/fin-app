'use client'

import { useEffect } from 'react'
import { ErrorFallback } from '@/components/error-fallback'
import { reportClientError } from '@/lib/error-log-client'

/**
 * Error boundary raíz (issue #200): captura errores en el propio root layout, que
 * `error.tsx` no puede alcanzar. Debe renderizar su propio <html>/<body>. Hace el
 * mismo POST best-effort a la ingesta de errores, marcado con `scope: 'global'`
 * para distinguir el origen.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    reportClientError(error, { scope: 'global' })
  }, [error])

  return (
    <html lang="es">
      <body className="min-h-full antialiased">
        <ErrorFallback onRetry={reset} />
      </body>
    </html>
  )
}
