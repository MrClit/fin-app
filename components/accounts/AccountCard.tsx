import Link from 'next/link'
import { Check, AlertTriangle, XCircle } from 'lucide-react'
import { fmt } from '@/lib/formatting'
import { getConsentStatus, type ConsentInfo } from '@/lib/accounts'
import { AccountIconBadge } from './AccountIconBadge'
import { SyncButton } from './SyncButton'
import { RenewBankButton } from './RenewBankButton'
import type { Account } from '@/types'

function getSyncStatus(iso: string | null): { label: string; color: string; Icon: typeof Check } {
  if (!iso) return { label: 'Nunca sincronizado', color: 'var(--muted-foreground)', Icon: XCircle }
  const hours = (Date.now() - new Date(iso).getTime()) / 3_600_000
  const label =
    hours < 1
      ? 'hace menos de 1 hora'
      : hours < 24
        ? `hace ${Math.floor(hours)} hora${Math.floor(hours) > 1 ? 's' : ''}`
        : `hace ${Math.floor(hours / 24)} día${Math.floor(hours / 24) > 1 ? 's' : ''}`
  if (hours < 24) return { label, color: '#22c55e', Icon: Check }
  if (hours < 72) return { label, color: '#f59e0b', Icon: AlertTriangle }
  return { label, color: '#ef4444', Icon: XCircle }
}

function SourceBadge({ source }: { source: Account['source'] }) {
  const config =
    source === 'enablebanking'
      ? { label: 'PSD2', bg: '#6366f122', color: '#6366f1' }
      : source === 'scraper'
        ? { label: 'Scraper', bg: '#f59e0b22', color: '#f59e0b' }
        : { label: 'Manual', bg: '#64748b22', color: '#64748b' }
  return (
    <span
      className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
      style={{ background: config.bg, color: config.color }}
    >
      {config.label}
    </span>
  )
}

/**
 * Badge de caducidad PSD2 (spec §9.2). Solo se muestra en `warning` (7-14 días)
 * y `expired`; en `critical` el aviso lo da el banner global, no la card.
 */
function ConsentBadge({ consent }: { consent: ConsentInfo }) {
  if (consent.status === 'warning') {
    return (
      <span
        className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
        style={{ background: '#f59e0b22', color: '#f59e0b' }}
      >
        Caduca en {consent.daysLeft} {consent.daysLeft === 1 ? 'día' : 'días'}
      </span>
    )
  }
  if (consent.status === 'expired') {
    return (
      <span
        className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
        style={{ background: '#ef444422', color: '#ef4444' }}
      >
        Conexión caducada
      </span>
    )
  }
  return null
}

export function AccountCard({ account }: { account: Account }) {
  const isNegative = (account.balance ?? 0) < 0
  const { label: syncLabel, color: syncColor, Icon: SyncIcon } = getSyncStatus(account.last_synced)
  const consent =
    account.source === 'enablebanking' ? getConsentStatus(account.consent_expires_at) : null
  const isExpired = consent?.status === 'expired'
  const needsRenew = consent?.status === 'critical' || consent?.status === 'expired'

  return (
    <div className="bg-card px-4 py-5 border-y border-border">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <AccountIconBadge type={account.type} color={account.color} size="lg" />
          <div>
            <div className="text-[15px] font-bold text-foreground leading-tight">
              {account.name}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {account.number ?? '—'}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <SourceBadge source={account.source} />
          {consent && <ConsentBadge consent={consent} />}
        </div>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <div className="text-xs text-muted-foreground mb-1">Saldo actual</div>
          <div
            className="text-[26px] font-extrabold tracking-tight leading-none"
            style={{
              color: isExpired
                ? 'var(--muted-foreground)'
                : isNegative
                  ? '#ef4444'
                  : undefined,
            }}
          >
            {account.balance !== null ? `${fmt(account.balance, 2)} €` : '—'}
          </div>
        </div>
        <Link
          href={`/transactions?account=${account.id}`}
          className="text-xs font-semibold px-3 py-1.5 rounded-[10px]"
          style={{ background: '#6366f115', color: '#6366f1' }}
        >
          Ver movimientos
        </Link>
      </div>

      <div className="mt-3.5 pt-3.5 border-t border-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <SyncIcon className="size-3 shrink-0" style={{ color: syncColor }} />
          <span style={{ color: syncColor }}>{syncLabel}</span>
        </div>
        {account.source === 'enablebanking' &&
          (needsRenew ? (
            <RenewBankButton accountId={account.id} expired={isExpired} />
          ) : (
            <SyncButton lastSynced={account.last_synced} />
          ))}
      </div>
    </div>
  )
}
