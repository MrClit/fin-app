'use client'

import { useEffect } from 'react'
import { ErrorFallback } from '@/components/error-fallback'
import { reportClientError } from '@/lib/error-log-client'

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
    reportClientError(error)
  }, [error])

  return <ErrorFallback onRetry={reset} />
}
