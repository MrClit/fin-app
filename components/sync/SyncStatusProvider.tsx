'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Toast } from '@/components/ui/toast'

interface ToastState {
  message: string
  onRetry?: () => void
}

interface SyncStatusValue {
  /** Sin conexión a internet (comprobación de red activa vía service worker). */
  isOffline: boolean
  /** Hay una sincronización manual en curso. */
  isSyncing: boolean
  /** La última sincronización falló o superó el timeout. */
  syncError: boolean
  /**
   * Lanza una sincronización manual contra /api/sync/enablebanking.
   * Con `accountId` la sync se limita a esa cuenta (renovación PSD2, issue #79).
   */
  runSync: (accountId?: string) => Promise<void>
  /** Muestra el toast genérico de error con un Reintentar opcional. */
  showToast: (message: string, onRetry?: () => void) => void
}

const SyncStatusContext = createContext<SyncStatusValue | null>(null)

/** Timeout de la sincronización manual (spec §8.2). */
const SYNC_TIMEOUT_MS = 10_000

export function SyncStatusProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [isOffline, setIsOffline] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncError, setSyncError] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)
  // Evita relanzar una sync mientras otra está en curso (sin esperar al re-render).
  const syncingRef = useRef(false)

  // Pide al service worker una comprobación de red ACTIVA. El SW responde con un
  // mensaje `connectivity` (lo escucha el efecto de abajo).
  const queryConnectivity = useCallback(() => {
    const sw = navigator.serviceWorker
    sw?.ready
      .then((reg) => (reg.active ?? sw.controller)?.postMessage({ type: 'connectivity-query' }))
      .catch(() => {})
  }, [])

  // Detección de conexión. El estado inicial es false en SSR y se corrige tras
  // el montaje para no provocar un mismatch de hidratación.
  //
  // Fuente de verdad: el service worker (issue #137). `navigator.onLine` NO es
  // fiable —en algunos entornos devuelve true sin red—, así que con SW no lo
  // usamos para marcar online: solo reaccionamos a la respuesta del SW y le
  // re-preguntamos ante cualquier cambio relevante. Sin SW (p. ej. en dev)
  // caemos a navigator.onLine como antes.
  useEffect(() => {
    const sw = navigator.serviceWorker

    if (!sw) {
      const fromNavigator = () => setIsOffline(!navigator.onLine)
      fromNavigator()
      window.addEventListener('online', fromNavigator)
      window.addEventListener('offline', fromNavigator)
      return () => {
        window.removeEventListener('online', fromNavigator)
        window.removeEventListener('offline', fromNavigator)
      }
    }

    const onSwMessage = (e: MessageEvent) => {
      const data = e.data as { type?: string; online?: boolean }
      if (data?.type === 'connectivity' && typeof data.online === 'boolean') {
        setIsOffline(!data.online)
      }
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') queryConnectivity()
    }

    sw.addEventListener('message', onSwMessage)
    queryConnectivity()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', queryConnectivity)
    window.addEventListener('offline', queryConnectivity)
    return () => {
      sw.removeEventListener('message', onSwMessage)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', queryConnectivity)
      window.removeEventListener('offline', queryConnectivity)
    }
  }, [queryConnectivity])

  // Re-comprueba la conexión en cada navegación: si estamos offline, la
  // comprobación activa del SW lo confirma y el banner se mantiene (antes una
  // página servida de caché ocultaba el banner al navegar).
  useEffect(() => {
    queryConnectivity()
  }, [pathname, queryConnectivity])

  const showToast = useCallback((message: string, onRetry?: () => void) => {
    setToast({ message, onRetry })
  }, [])

  const dismissToast = useCallback(() => setToast(null), [])

  const runSync = useCallback(async (accountId?: string) => {
    if (syncingRef.current) return
    syncingRef.current = true
    setIsSyncing(true)
    setSyncError(false)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), SYNC_TIMEOUT_MS)

    try {
      const res = await fetch('/api/sync/enablebanking', {
        method: 'POST',
        signal: controller.signal,
        ...(accountId && {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountId }),
        }),
      })
      // 429 = cooldown: no es un fallo de sync; aviso suave sin banner ámbar.
      if (res.status === 429) {
        showToast('Has alcanzado el límite de sincronizaciones. Inténtalo más tarde.')
        return
      }
      if (!res.ok) throw new Error(`sync failed: ${res.status}`)
      // Refresca los Server Components para traer saldos y last_synced nuevos.
      router.refresh()
    } catch (err) {
      console.error('[SyncStatusProvider.runSync]', err)
      setSyncError(true)
    } finally {
      clearTimeout(timeout)
      syncingRef.current = false
      setIsSyncing(false)
    }
  }, [router, showToast])

  const value = useMemo<SyncStatusValue>(
    () => ({ isOffline, isSyncing, syncError, runSync, showToast }),
    [isOffline, isSyncing, syncError, runSync, showToast]
  )

  return (
    <SyncStatusContext.Provider value={value}>
      {children}
      {toast && (
        <Toast message={toast.message} onRetry={toast.onRetry} onDismiss={dismissToast} />
      )}
    </SyncStatusContext.Provider>
  )
}

export function useSyncStatus(): SyncStatusValue {
  const ctx = useContext(SyncStatusContext)
  if (!ctx) throw new Error('useSyncStatus debe usarse dentro de <SyncStatusProvider>')
  return ctx
}
