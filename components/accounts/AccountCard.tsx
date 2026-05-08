import { Check, AlertTriangle, XCircle } from 'lucide-react'
import { fmt } from '@/lib/formatting'
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

export function AccountCard({ account }: { account: Account }) {
  const color = account.color ?? '#6366f1'
  const isNegative = (account.balance ?? 0) < 0
  const { label: syncLabel, color: syncColor, Icon: SyncIcon } = getSyncStatus(account.last_synced)

  return (
    <div className="bg-card rounded-[20px] p-5 border border-border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="size-11 rounded-[14px] flex items-center justify-center"
            style={{ background: color + '22' }}
          >
            <div className="size-4.5 rounded-[5px]" style={{ background: color }} />
          </div>
          <div>
            <div className="text-[15px] font-bold text-foreground leading-tight">
              {account.name}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {account.number ?? '—'}
            </div>
          </div>
        </div>

        <SourceBadge source={account.source} />
      </div>

      <div className="flex items-end justify-between">
        <div>
          <div className="text-xs text-muted-foreground mb-1">Saldo actual</div>
          <div
            className="text-[26px] font-extrabold tracking-tight leading-none"
            style={{ color: isNegative ? '#ef4444' : undefined }}
          >
            {account.balance !== null ? `${fmt(account.balance, 2)} €` : '—'}
          </div>
        </div>
        <div
          className="text-xs font-semibold px-3 py-1.5 rounded-[10px]"
          style={{ background: '#6366f115', color: '#6366f1' }}
        >
          Ver movimientos
        </div>
      </div>

      <div className="mt-3.5 pt-3.5 border-t border-border text-[11px] text-muted-foreground flex items-center gap-1.5">
        <SyncIcon className="size-3 shrink-0" style={{ color: syncColor }} />
        <span style={{ color: syncColor }}>{syncLabel}</span>
      </div>
    </div>
  )
}
