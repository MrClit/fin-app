import Link from 'next/link'
import { Amount } from '@/components/ui/amount'
import { AccountIconBadge } from '@/components/accounts/AccountIconBadge'
import type { Account, AccountType } from '@/types'

const typeLabel: Record<AccountType, string> = {
  bank:     'Cuenta',
  card:     'Tarjeta',
  edenred:  'Edenred',
  cash:     'Efectivo',
}

function AccountCell({ account }: { account: Account }) {
  const balance = account.balance ?? 0
  const isNegative = balance < 0

  return (
    <Link
      href="/accounts"
      className="block bg-secondary px-4 py-4 border-r border-b border-border active:opacity-70 transition-opacity"
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
        style={{ color: isNegative ? 'var(--negative)' : undefined }}
      >
        <Amount value={balance} decimals={2} />
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

  // Cada celda enmarcada con border-r/border-b y el contenedor aporta border-t/border-l:
  // así toda card tiene sus 4 lados (también las del borde derecho/inferior) con líneas
  // uniformes de 1px y sin solapamientos. Si el total es impar, un placeholder completa
  // la última fila para que el marco no quede roto.
  const needsPlaceholder = accounts.length % 2 === 1

  return (
    <div>
      <div className="text-[13px] font-semibold text-muted-foreground mb-3">Mis cuentas</div>
      <div className="-mx-4 grid grid-cols-2 border-t border-l border-border">
        {accounts.map(account => (
          <AccountCell key={account.id} account={account} />
        ))}
        {needsPlaceholder && <div className="bg-secondary border-r border-b border-border" aria-hidden />}
      </div>
    </div>
  )
}
