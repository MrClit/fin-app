import Link from 'next/link'
import { fmt } from '@/lib/formatting'
import type { Account, AccountType } from '@/types'

const typeLabel: Record<AccountType, string> = {
  bank:     'Cuenta',
  card:     'Tarjeta',
  edenred:  'Edenred',
  cash:     'Efectivo',
}

function AccountMiniCard({ account }: { account: Account }) {
  const color = account.color ?? '#6366f1'
  const balance = account.balance ?? 0
  const isNegative = balance < 0

  return (
    <Link
      href="/cuentas"
      className="block bg-card rounded-2xl p-3.5 border border-border active:opacity-70 transition-opacity"
    >
      <div className="flex items-center justify-between mb-2.5">
        <div
          className="size-8 rounded-[10px] flex items-center justify-center"
          style={{ background: color + '22' }}
        >
          <div className="size-3 rounded-[3px]" style={{ background: color }} />
        </div>
        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide">
          {typeLabel[account.type]}
        </span>
      </div>
      <div className="text-[11px] text-muted-foreground truncate mb-0.5">{account.name}</div>
      <div
        className="text-[17px] font-bold leading-tight"
        style={{ color: isNegative ? '#ef4444' : undefined }}
      >
        {fmt(balance, 2)} €
      </div>
      {account.number && (
        <div className="text-[10px] text-muted-foreground mt-0.5">{account.number}</div>
      )}
    </Link>
  )
}

interface DashboardAccountGridProps {
  accounts: Account[]
}

export function DashboardAccountGrid({ accounts }: DashboardAccountGridProps) {
  if (accounts.length === 0) return null

  return (
    <div>
      <div className="text-[13px] font-semibold text-muted-foreground mb-3">Mis cuentas</div>
      <div className="grid grid-cols-2 gap-3">
        {accounts.map(account => (
          <AccountMiniCard key={account.id} account={account} />
        ))}
      </div>
    </div>
  )
}
