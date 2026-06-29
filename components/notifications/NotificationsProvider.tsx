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
// visible. Cubre que el nº de no leídas cambie desde otro dispositivo (o que un
// scraper inserte una notificación) con esta app abierta y en primer plano.
const POLL_INTERVAL_MS = 60_000

interface NotificationsValue {
  /** Nº de notificaciones no leídas (alimenta el badge de la campana). */
  count: number
  /** Fija el contador (p. ej. a 0 tras marcar todas leídas, o a un valor fresco). */
  setCount: (n: number) => void
}

// Default no-op: la campana podría renderizarse fuera del grupo (app) (sin
// provider); allí el badge simplemente no aparece (count 0) en vez de romper.
const NotificationsContext = createContext<NotificationsValue>({
  count: 0,
  setCount: () => {},
})

export function NotificationsProvider({
  initialCount,
  children,
}: {
  initialCount: number
  children: React.ReactNode
}) {
  const [count, setCountState] = useState(initialCount)

  // El layout (server component) recomputa `initialCount` tras un router.refresh().
  // useState ignora cambios de prop, así que sincronizamos al valor fresco del
  // servidor durante el render cuando cambia (patrón recomendado por React frente a
  // un effect). Mismo enfoque que UnreadProvider (#149).
  const [prevInitial, setPrevInitial] = useState(initialCount)
  if (initialCount !== prevInitial) {
    setPrevInitial(initialCount)
    setCountState(initialCount)
  }

  const setCount = useCallback((n: number) => setCountState(Math.max(0, n)), [])

  // Revalida el contador contra el servidor y fija el valor autoritativo. Se
  // autolimita a la app visible para no consultar en segundo plano.
  const revalidate = useCallback(() => {
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
      return
    }
    fetch('/api/notifications/unread-count', { cache: 'no-store' })
      .then(res => (res.ok ? res.json() : null))
      .then(json => {
        if (json && typeof json.count === 'number') setCount(json.count)
      })
      .catch(() => {
        // Sin red / offline: conservar el valor actual, no romper el badge.
      })
  }, [setCount])

  // Revalidamos en tres momentos, todos con la app visible: al volver a primer
  // plano (reabrir la PWA en iOS), periódicamente mientras está visible, y en cada
  // navegación. Idéntico a UnreadProvider.
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

  const value = useMemo<NotificationsValue>(
    () => ({ count, setCount }),
    [count, setCount]
  )

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}

export function useNotifications(): NotificationsValue {
  return useContext(NotificationsContext)
}
