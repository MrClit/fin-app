'use client'

import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react'
import { useSyncStatus } from './SyncStatusProvider'

/**
 * Banner superior de estado de sync/conexión. Solo se muestra uno a la vez,
 * con precedencia: offline > error de sync > sincronizando (spec §8.1/§8.2).
 * Se renderiza dentro del <header> sticky, justo debajo de la barra global.
 */
export function StatusBanner() {
  const { isOffline, isSyncing, syncError, runSync } = useSyncStatus()

  if (isOffline) {
    return (
      <Banner color="#64748b">
        <WifiOff className="size-3.5 shrink-0" />
        <span>Sin conexión. Mostrando datos guardados</span>
      </Banner>
    )
  }

  if (syncError) {
    return (
      <Banner color="#f59e0b">
        <AlertTriangle className="size-3.5 shrink-0" />
        <span>No pudimos sincronizar.</span>
        <button
          type="button"
          onClick={() => runSync()}
          className="ml-auto shrink-0 font-bold underline underline-offset-2"
        >
          Reintentar →
        </button>
      </Banner>
    )
  }

  if (isSyncing) {
    return (
      <Banner color="#3b82f6">
        <RefreshCw className="size-3.5 shrink-0 animate-spin" />
        <span>Sincronizando…</span>
      </Banner>
    )
  }

  return null
}

function Banner({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div
      role="status"
      className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium animate-fade-in"
      style={{ background: color + '1f', color, borderTop: `1px solid ${color}26` }}
    >
      {children}
    </div>
  )
}
