import Link from 'next/link'
import { Amount } from '@/components/ui/amount'
import { AccountIconBadge } from '@/components/accounts/AccountIconBadge'
import { cn } from '@/lib/utils'
import type { Account, AccountType } from '@/types'

const typeLabel: Record<AccountType, string> = {
  bank:     'Cuenta',
  card:     'Tarjeta',
  edenred:  'Edenred',
  cash:     'Efectivo',
  savings:  'Ahorro',
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
        <span className="text-3xs font-bold text-muted-foreground uppercase tracking-wide">
          {typeLabel[account.type]}
        </span>
      </div>
      <div className="text-2xs text-muted-foreground truncate mb-0.5">{account.name}</div>
      <div
        className="text-lg font-bold leading-tight"
        style={{ color: isNegative ? 'var(--negative)' : undefined }}
      >
        <Amount value={balance} decimals={2} />
      </div>
      {account.number && (
        <div className="text-3xs text-muted-foreground mt-0.5">{account.number}</div>
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
  // uniformes de 1px y sin solapamientos. Si la última fila queda incompleta, unos
  // placeholders la completan para que el marco no quede roto.
  //
  // El número de columnas cambia por breakpoint (2 → 3 en `md` → 4 en `lg`, #366) y con
  // él cuántas celdas faltan, cosa que el CSS no puede calcular. Se resuelven los tres
  // restos en servidor y se renderizan todos los placeholders posibles, cada uno visible
  // sólo en los breakpoints donde hace falta.
  const missing = (cols: number) => (cols - (accounts.length % cols)) % cols
  const [f2, f3, f4] = [missing(2), missing(3), missing(4)]

  return (
    <div>
      <div className="text-sm font-semibold text-muted-foreground mb-3">Mis cuentas</div>
      {/* El marco vive en el envoltorio: al redondear en `md`, el arco recortaría los
          bordes de las celdas del extremo y dejaría tres esquinas rotas. Con el borde
          completo en el contenedor y la rejilla desplazada 1px, los bordes sobrantes de
          la última columna y la última fila caen fuera y los recorta el `overflow-clip`. */}
      <div className="-mx-4 border-t border-l border-border md:mx-0 md:overflow-clip md:rounded-2xl md:border">
        <div className="grid grid-cols-2 md:-mr-px md:-mb-px md:grid-cols-3 lg:grid-cols-4">
          {accounts.map(account => (
            <AccountCell key={account.id} account={account} />
          ))}
          {Array.from({ length: Math.max(f2, f3, f4) }, (_, i) => (
            <div
              key={i}
              aria-hidden
              className={cn(
                'bg-secondary border-r border-b border-border',
                i < f2 ? 'block' : 'hidden',
                i < f3 ? 'md:block' : 'md:hidden',
                i < f4 ? 'lg:block' : 'lg:hidden',
              )}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
