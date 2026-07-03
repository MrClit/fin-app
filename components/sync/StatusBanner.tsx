'use client'

import Link from 'next/link'
import { AlertTriangle, RefreshCw, ShieldAlert, WifiOff } from 'lucide-react'
import { useSyncStatus } from './SyncStatusProvider'
import type { ConsentBannerData } from '@/lib/accounts'

/**
 * Banner superior de estado. Solo se muestra uno a la vez, con precedencia:
 * caducidad PSD2 > offline > error de sync > sincronizando (spec §8.1/§8.2/§9.2).
 * El aviso de caducidad es persistente y de acción requerida, así que tiene
 * prioridad sobre los estados transitorios de sync.
 * Se renderiza dentro del <header> sticky, justo debajo de la barra global.
 */
export function StatusBanner({ consent }: { consent: ConsentBannerData | null }) {
  const { isOffline, isSyncing, syncError, runSync } = useSyncStatus()

  if (consent) {
    return (
      <Banner color="var(--negative)">
        <ShieldAlert className="size-3.5 shrink-0" />
        <span>{consentMessage(consent)}</span>
        <Link
          href="/accounts"
          className="ml-auto shrink-0 font-bold underline underline-offset-2"
        >
          Renovar →
        </Link>
      </Banner>
    )
  }

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

/** Texto del banner de caducidad PSD2 (spec §9.2). */
function consentMessage(consent: ConsentBannerData): string {
  if (consent.count > 1 || !consent.only) {
    return `Tienes ${consent.count} conexiones por renovar.`
  }
  const { name, status, expiresAt } = consent.only
  if (status === 'expired') {
    return `Tu conexión con ${name} ha caducado.`
  }
  return `Tu conexión con ${name} caduca el ${formatExpiry(expiresAt)}.`
}

function formatExpiry(iso: string | null): string {
  if (!iso) return 'pronto'
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })
}

function Banner({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div
      role="status"
      className="flex items-center gap-2 px-4 py-2 text-sm font-medium animate-fade-in"
      style={{
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
        color,
        borderTop: `1px solid color-mix(in srgb, ${color} 15%, transparent)`,
      }}
    >
      {children}
    </div>
  )
}
