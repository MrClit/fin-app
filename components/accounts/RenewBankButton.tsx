'use client'

import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { useSyncStatus } from '@/components/sync/SyncStatusProvider'

/**
 * CTA de renovación del consentimiento PSD2 en la card de cuenta (issue #79).
 * Se muestra cuando la conexión está `critical` o `expired`. Inicia el flujo
 * OAuth de re-autorización contra /api/banking/renew.
 */
export function RenewBankButton({
  accountId,
  expired,
}: {
  accountId: string
  expired: boolean
}) {
  const { showToast } = useSyncStatus()
  const [loading, setLoading] = useState(false)

  // Rojo si ya caducó; ámbar si está a punto de caducar.
  const color = expired ? '#ef4444' : '#f59e0b'

  async function handleRenew() {
    setLoading(true)
    try {
      const res = await fetch('/api/banking/renew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      })
      if (res.status === 422) {
        showToast(
          'No identificamos el banco de esta cuenta. Renuévala desde «Conectar nueva cuenta».'
        )
        return
      }
      if (!res.ok) throw new Error(`renew failed: ${res.status}`)
      const { url } = await res.json()
      window.location.href = url
    } catch (err) {
      console.error('[RenewBankButton]', err)
      showToast('No se pudo iniciar la renovación. Inténtalo de nuevo.')
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleRenew}
      disabled={loading}
      className="flex shrink-0 items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-[11px] font-semibold transition-opacity disabled:opacity-40"
      style={{ background: color + '22', color }}
    >
      <ShieldCheck className="size-3 shrink-0" />
      {loading ? 'Abriendo…' : 'Renovar conexión'}
    </button>
  )
}
