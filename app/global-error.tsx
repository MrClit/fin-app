'use client'

import { useEffect } from 'react'

/**
 * Error boundary raíz (issue #200): captura errores en el propio root layout, que
 * `error.tsx` no puede alcanzar. Debe renderizar su propio <html>/<body>. Hace el
 * mismo POST best-effort a la ingesta de errores.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    fetch('/api/error-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        route: window.location.pathname,
        context: { digest: error.digest, scope: 'global' },
      }),
    }).catch(() => {
      // best-effort
    })
  }, [error])

  return (
    <html lang="es">
      <body className="min-h-full antialiased">
        <div className="grid min-h-dvh place-items-center px-6 text-center">
          <div className="flex max-w-sm flex-col items-center gap-4">
            <h1 className="text-lg font-semibold">Algo salió mal</h1>
            <p className="text-sm text-muted-foreground">
              Se ha producido un error inesperado. Puedes reintentar; si vuelve a
              ocurrir, ya hemos registrado el fallo.
            </p>
            <button
              type="button"
              onClick={reset}
              className="rounded-2xl bg-foreground px-5 py-2.5 text-sm font-medium text-background"
            >
              Reintentar
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
