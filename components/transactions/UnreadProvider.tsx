'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { usePathname } from 'next/navigation'

// Cada cuánto revalidar el contador contra el servidor mientras la app está
// visible. Cubre el caso de que el nº de no leídos cambie desde otro dispositivo
// con esta app abierta y en primer plano (no hay router.refresh ni navegación).
const POLL_INTERVAL_MS = 60_000

interface UnreadValue {
  /** Nº de movimientos no leídos (alimenta el badge de la tabBar). */
  count: number
  /** Ajuste optimista: marcar uno como leído. */
  decrement: () => void
  /** Ajuste optimista: marcar uno como no leído (o rollback de un decrement). */
  increment: () => void
  /** Fija el contador (p.ej. al recibir un count fresco del servidor). */
  setCount: (n: number) => void
}

// Default no-op: la tabBar (`BottomNav`) también se renderiza en /~offline, fuera
// del grupo (app) y por tanto sin provider. Allí el badge simplemente no aparece
// (count 0) en vez de romper.
const UnreadContext = createContext<UnreadValue>({
  count: 0,
  decrement: () => {},
  increment: () => {},
  setCount: () => {},
})

export function UnreadProvider({
  initialCount,
  children,
}: {
  initialCount: number
  children: React.ReactNode
}) {
  const [count, setCountState] = useState(initialCount)

  // El layout (server component) recomputa `initialCount` tras un router.refresh()
  // (p.ej. después de una sincronización que trae movimientos nuevos no leídos).
  // useState ignora los cambios de prop, así que sincronizamos al valor fresco del
  // servidor —autoritativo— ajustando durante el render cuando cambia (patrón
  // recomendado por React frente a un effect). No interfiere con los ajustes
  // optimistas de marcar leído/no leído, que no disparan refresh del layout.
  const [prevInitial, setPrevInitial] = useState(initialCount)
  if (initialCount !== prevInitial) {
    setPrevInitial(initialCount)
    setCountState(initialCount)
  }

  const decrement = useCallback(() => setCountState(c => Math.max(0, c - 1)), [])
  const increment = useCallback(() => setCountState(c => c + 1), [])
  const setCount = useCallback((n: number) => setCountState(Math.max(0, n)), [])

  // Revalida el contador contra el servidor y fija el valor autoritativo. Barata
  // (solo el conteo) e independiente de los ajustes optimistas de marcar leído.
  // Se autolimita a la app visible para no consultar en segundo plano.
  const revalidate = useCallback(() => {
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
      return
    }
    fetch('/api/transactions/unread-count', { cache: 'no-store' })
      .then(res => (res.ok ? res.json() : null))
      .then(json => {
        if (json && typeof json.count === 'number') setCount(json.count)
      })
      .catch(() => {
        // Sin red / offline: conservar el valor actual, no romper el badge.
      })
  }, [setCount])

  // El badge vive en el layout y no se recomputa con la navegación soft de App
  // Router (reutiliza el layout cacheado), así que sin estos disparadores se
  // queda obsoleto cuando el nº de no leídos cambia por fuera (otra sesión u
  // otro dispositivo). Revalidamos en tres momentos, todos con la app visible:
  //  1. Al volver a primer plano (visibilitychange) — reabrir la PWA en iOS.
  //  2. Periódicamente mientras está visible — la app abierta y un cambio
  //     externo, sin navegar ni mandarla a segundo plano.
  //  3. En cada navegación (cambio de pathname) — feedback inmediato al moverse.
  useEffect(() => {
    document.addEventListener('visibilitychange', revalidate)
    const intervalId = setInterval(revalidate, POLL_INTERVAL_MS)
    return () => {
      document.removeEventListener('visibilitychange', revalidate)
      clearInterval(intervalId)
    }
  }, [revalidate])

  const pathname = usePathname()
  useEffect(() => {
    revalidate()
  }, [pathname, revalidate])

  const value = useMemo<UnreadValue>(
    () => ({ count, decrement, increment, setCount }),
    [count, decrement, increment, setCount]
  )

  return <UnreadContext.Provider value={value}>{children}</UnreadContext.Provider>
}

export function useUnread(): UnreadValue {
  return useContext(UnreadContext)
}
