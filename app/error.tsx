'use client'

import { useEffect } from 'react'

/**
 * Error boundary del App Router (issue #200). Captura errores de renderizado en
 * las rutas y, además del fallback visual, hace un POST best-effort a la ingesta
 * de errores. El POST nunca bloquea ni rompe el fallback.
 */
export default function Error({
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
        context: { digest: error.digest },
      }),
    }).catch(() => {
      // best-effort: si la ingesta falla, no hay nada más que hacer
    })
  }, [error])

  return (
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
  )
}
