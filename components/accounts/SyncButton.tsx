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
      // El fondo pasa de `style` inline a token: sólo así puede haber un `hover:bg-*`,
      // que una declaración inline ganaría siempre (#369). `#6366f115` era `--primary`
      // al 8%; se normaliza al 10%, indistinguible y expresable con el token.
      className="flex shrink-0 items-center gap-1.5 rounded-[10px] bg-primary/10 px-3 py-1.5 text-2xs font-semibold text-primary transition-[opacity,background-color] enabled:hover:bg-primary/20 disabled:opacity-40"
    >
      <RefreshCw className={`size-3 ${isSyncing ? 'animate-spin' : ''}`} />
      <span suppressHydrationWarning>{label}</span>
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
