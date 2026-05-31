'use client'

import { useSyncExternalStore } from 'react'
import { BottomNav } from '@/components/bottom-nav'

// La ruta intentada no cambia sin una navegación completa, así que no hay nada a lo que
// suscribirse: subscribe es un no-op.
const subscribe = () => () => {}

/**
 * Bottom nav para la pantalla de fallback `/~offline`. El SW sirve ahí el documento
 * horneado de `/~offline`, por lo que `usePathname()` devuelve `/~offline` en vez de la
 * ruta que el usuario intentó abrir. Leemos `window.location.pathname` (la URL del
 * navegador sí es la ruta intentada) para resaltar en la barra la sección pulsada.
 *
 * `alwaysShow` evita que la barra se auto-oculte si la ruta fallida era de categoría.
 */
export function OfflineBottomNav() {
  const activePath = useSyncExternalStore(
    subscribe,
    () => window.location.pathname,
    () => undefined,
  )

  return <BottomNav alwaysShow activePath={activePath} />
}
