'use client'

import { useEffect, useRef } from 'react'
import { useSyncStatus } from '@/components/sync/SyncStatusProvider'

/**
 * Tras renovar el consentimiento PSD2 lanza una sync inmediata de la cuenta
 * renovada para cubrir el hueco temporal de la caducidad (issue #79, spec §9.4).
 * No renderiza nada. `router.refresh()` no remonta clientes, así que el guard
 * `useRef` evita un segundo disparo.
 */
export function RenewedSyncTrigger({ accountId }: { accountId: string }) {
  const { runSync } = useSyncStatus()
  const fired = useRef(false)

  useEffect(() => {
    if (fired.current) return
    fired.current = true
    runSync(accountId)
  }, [accountId, runSync])

  return null
}
