'use client'

import { useSyncExternalStore } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

function subscribe(onChange: () => void): () => void {
  const mql = window.matchMedia(QUERY)
  mql.addEventListener('change', onChange)
  return () => mql.removeEventListener('change', onChange)
}

const getSnapshot = (): boolean => window.matchMedia(QUERY).matches

// En SSR no hay `matchMedia`: asumimos sin reducción (snapshot estable).
const getServerSnapshot = (): boolean => false

/**
 * Indica si el usuario ha pedido reducir el movimiento a nivel de sistema,
 * suscribiéndose a cambios en la preferencia.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
