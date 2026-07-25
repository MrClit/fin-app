'use client'

import { useEffect, useRef } from 'react'
import { createRejectionReporter } from '@/lib/error-log-client'

/**
 * Registra en `error_log` los rechazos de promesa no capturados (issue #387).
 *
 * Los error boundaries del App Router solo ven errores de renderizado: ni React ni
 * el router encaminan un `unhandledrejection` a un boundary (verificado en
 * react-dom y en el router de Next 16). Sin esto, un `fetch` que falla sin
 * `.catch()` —el caso típico al reabrir la PWA en iOS, con el service worker
 * reiniciándose— no deja ningún rastro accionable.
 *
 * No renderiza nada. El tope por carga y el dedupe por mensaje viven en el reporter,
 * para que una ráfaga de fallos de red no inunde la ingesta.
 */
export function GlobalRejectionReporter() {
  // Una sola instancia por carga de página: el tope y el dedupe son suyos.
  const reporter = useRef<((reason: unknown) => void) | null>(null)
  reporter.current ??= createRejectionReporter()

  useEffect(() => {
    const onRejection = (event: PromiseRejectionEvent) => reporter.current?.(event.reason)
    window.addEventListener('unhandledrejection', onRejection)
    return () => window.removeEventListener('unhandledrejection', onRejection)
  }, [])

  return null
}
