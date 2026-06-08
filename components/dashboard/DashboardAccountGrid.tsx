import Link from 'next/link'
import { fmt } from '@/lib/formatting'
import { AccountIconBadge } from '@/components/accounts/AccountIconBadge'
import type { Account, AccountType } from '@/types'

const typeLabel: Record<AccountType, string> = {
  bank:     'Cuenta',
  card:     'Tarjeta',
  edenred:  'Edenred',
  cash:     'Efectivo',
}

function AccountCell({ account, className }: { account: Account; className?: string }) {
  const balance = account.balance ?? 0
  const isNegative = balance < 0

  return (
    <Link
      href="/accounts"
      className={`block px-4 py-4 active:opacity-70 transition-opacity ${className ?? ''}`}
    >
      <div className="flex items-center justify-between mb-2.5">
        <AccountIconBadge type={account.type} color={account.color} size="sm" />
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
      {/* Bloque a ancho completo con divisores internos (sin cajas redondeadas),
          al estilo de las tarjetas de Ingresos/Gastos de Análisis. */}
      <div className="-mx-4 grid grid-cols-2 bg-secondary border-y border-border">
        {accounts.map((account, i) => (
          <AccountCell
            key={account.id}
            account={account}
            className={[
              i % 2 === 1 ? 'border-l border-border' : '',
              i >= 2 ? 'border-t border-border' : '',
            ].join(' ')}
          />
        ))}
      </div>
    </div>
  )
}
