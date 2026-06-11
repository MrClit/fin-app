'use client'

import { X } from 'lucide-react'

interface ToastProps {
  message: string
  onRetry?: () => void
  onDismiss: () => void
}

/**
 * Toast genérico y persistente para errores inesperados.
 * No se auto-cierra: el usuario lo descarta con la X o pulsando Reintentar.
 * El estado vive en SyncStatusProvider; este componente es presentacional.
 */
export function Toast({ message, onRetry, onDismiss }: ToastProps) {
  return (
    <div
      role="alert"
      className="fixed left-1/2 z-120 w-full max-w-105 -translate-x-1/2 px-4 animate-fade-in"
      style={{ bottom: 'calc(max(env(safe-area-inset-bottom), 1.5rem) + 84px)' }}
    >
      <div className="flex items-center gap-3 rounded-2xl bg-foreground px-4 py-3 text-background shadow-lg">
        <span className="flex-1 text-sm font-medium">{message}</span>
        {onRetry && (
          <button
            type="button"
            onClick={() => {
              onRetry()
              onDismiss()
            }}
            className="shrink-0 text-sm font-bold underline underline-offset-2"
          >
            Reintentar
          </button>
        )}
        <button
          type="button"
          aria-label="Cerrar"
          onClick={onDismiss}
          className="grid size-5 shrink-0 place-items-center opacity-60"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  )
}
