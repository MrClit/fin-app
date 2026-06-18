'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

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

  // En una PWA (sobre todo iOS) reabrir la app desde segundo plano no re-ejecuta
  // el server component del layout, así que el badge se quedaba clavado con el
  // último valor (p.ej. seguía marcando no leídos ya leídos en otra sesión o en
  // un sync en background). Al volver a primer plano revalidamos el contador
  // contra el servidor —consulta barata, solo el conteo— y fijamos el valor
  // autoritativo. Es independiente de los ajustes optimistas de marcar leído.
  useEffect(() => {
    function revalidate() {
      if (document.visibilityState !== 'visible') return
      fetch('/api/transactions/unread-count', { cache: 'no-store' })
        .then(res => (res.ok ? res.json() : null))
        .then(json => {
          if (json && typeof json.count === 'number') setCount(json.count)
        })
        .catch(() => {
          // Sin red / offline: conservar el valor actual, no romper el badge.
        })
    }
    document.addEventListener('visibilitychange', revalidate)
    return () => document.removeEventListener('visibilitychange', revalidate)
  }, [setCount])

  const value = useMemo<UnreadValue>(
    () => ({ count, decrement, increment, setCount }),
    [count, decrement, increment, setCount]
  )

  return <UnreadContext.Provider value={value}>{children}</UnreadContext.Provider>
}

export function useUnread(): UnreadValue {
  return useContext(UnreadContext)
}
