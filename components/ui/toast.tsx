'use client'

import { X } from 'lucide-react'

interface ToastProps {
  message: string
  onRetry?: () => void
  /**
   * Acción con etiqueta propia, para los avisos que no son un error (#359: «87
   * movimientos más de MERCADONA — Cambiar todos»). Excluyente con `onRetry`:
   * un toast ofrece una acción, no dos.
   */
  action?: { label: string; onPress: () => void }
  onDismiss: () => void
}

/**
 * Toast genérico y persistente. No se auto-cierra: el usuario lo descarta con la
 * X o pulsando la acción. El estado vive en SyncStatusProvider; este componente
 * es presentacional.
 */
export function Toast({ message, onRetry, action, onDismiss }: ToastProps) {
  return (
    <div
      role="alert"
      className="fixed content-anchored z-120 px-4 animate-fade-in"
      style={{ bottom: 'calc(max(env(safe-area-inset-bottom), 1.5rem) + 84px)' }}
    >
      <div className="flex items-center gap-3 rounded-2xl bg-foreground px-4 py-3 text-background shadow-lg">
        <span className="flex-1 text-sm font-medium">{message}</span>
        {(onRetry || action) && (
          <button
            type="button"
            onClick={() => {
              if (action) action.onPress()
              else onRetry?.()
              onDismiss()
            }}
            className="shrink-0 text-sm font-bold underline underline-offset-2"
          >
            {action ? action.label : 'Reintentar'}
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
