'use client'

/**
 * Fallback visual compartido por los dos error boundaries del App Router
 * (`app/error.tsx` y `app/global-error.tsx`, issue #200). Viven separados porque
 * `global-error.tsx` sustituye al root layout y debe aportar su propio
 * <html>/<body>, así que la UI se comparte por aquí (issue #303).
 */
export function ErrorFallback({ onRetry }: { onRetry: () => void }) {
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
          onClick={onRetry}
          className="rounded-2xl bg-foreground px-5 py-2.5 text-sm font-medium text-background"
        >
          Reintentar
        </button>
      </div>
    </div>
  )
}
