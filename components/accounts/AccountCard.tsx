import { Check } from 'lucide-react'
import { fmt } from '@/lib/formatting'
import type { Account } from '@/types'

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const hours = Math.floor(diffMs / 3_600_000)
  if (hours < 1) return 'hace menos de 1 hora'
  if (hours < 24) return `hace ${hours} hora${hours > 1 ? 's' : ''}`
  const days = Math.floor(hours / 24)
  return `hace ${days} día${days > 1 ? 's' : ''}`
}

export function AccountCard({ account }: { account: Account }) {
  const color = account.color ?? '#6366f1'
  const isPsd2 = account.source === 'enablebanking'
  const isNegative = (account.balance ?? 0) < 0

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

        <span
          className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
          style={{
            background: isPsd2 ? '#6366f122' : '#f59e0b22',
            color: isPsd2 ? '#6366f1' : '#f59e0b',
          }}
        >
          {isPsd2 ? 'PSD2' : 'Scraper'}
        </span>
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
        <Check className="size-3 shrink-0" style={{ color: '#22c55e' }} />
        {account.last_synced ? formatRelativeTime(account.last_synced) : 'Nunca sincronizado'}
      </div>
    </div>
  )
}
