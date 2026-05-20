'use client'

import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { useSyncStatus } from '@/components/sync/SyncStatusProvider'
import { syncAvailableAt } from '@/lib/sync'

/**
 * Botón de sincronización manual para la card de cuenta.
 * El endpoint /api/sync/enablebanking recorre todas las cuentas Enable Banking,
 * así que un único botón sincroniza toda la conexión.
 * Se deshabilita durante el cooldown de 6h (rate limit de EB, ver lib/sync.ts).
 */
export function SyncButton({ lastSynced }: { lastSynced: string | null }) {
  const { runSync, isSyncing, isOffline } = useSyncStatus()
  // El contador del cooldown se refresca cada 30s mientras el botón está montado.
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  const availableAt = syncAvailableAt(lastSynced)
  const inCooldown = availableAt !== null && availableAt > now

  const label = isSyncing
    ? 'Sincronizando…'
    : inCooldown
      ? `Disponible en ${formatRemaining(availableAt - now)}`
      : 'Sincronizar'

  return (
    <button
      type="button"
      onClick={() => runSync()}
      disabled={isSyncing || isOffline || inCooldown}
      className="flex shrink-0 items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-[11px] font-semibold transition-opacity disabled:opacity-40"
      style={{ background: '#6366f115', color: '#6366f1' }}
    >
      <RefreshCw className={`size-3 ${isSyncing ? 'animate-spin' : ''}`} />
      {label}
    </button>
  )
}

function formatRemaining(ms: number): string {
  const totalMin = Math.ceil(ms / 60_000)
  if (totalMin >= 60) {
    const h = Math.floor(totalMin / 60)
    const m = totalMin % 60
    return m > 0 ? `${h}h ${m}min` : `${h}h`
  }
  return `${totalMin}min`
}
