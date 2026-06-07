import { accountTypeIcon } from '@/lib/accounts'
import type { Account } from '@/types'

/**
 * Presets de tamaño del badge (contenedor / radio / icono, en px).
 * - `lg`: pantalla Cuentas (AccountCard)
 * - `md`: filtro de cuentas en Movimientos
 * - `sm`: rejilla del dashboard
 */
const SIZES = {
  sm: { box: 32, radius: 10, icon: 16 },
  md: { box: 34, radius: 10, icon: 17 },
  lg: { box: 44, radius: 14, icon: 22 },
} as const

interface AccountIconBadgeProps {
  type: Account['type']
  color?: string | null
  size?: keyof typeof SIZES
  className?: string
}

/**
 * Badge cuadrado redondeado con el icono del tipo de cuenta, teñido con el color
 * de la cuenta sobre un fondo translúcido del mismo color. Fuente única de verdad
 * para el icono de cuenta en dashboard, pantalla Cuentas y filtro de Movimientos.
 */
export function AccountIconBadge({ type, color, size = 'md', className }: AccountIconBadgeProps) {
  const c = color ?? '#6366f1'
  const Icon = accountTypeIcon[type]
  const s = SIZES[size]
  return (
    <div
      className={`flex items-center justify-center shrink-0 ${className ?? ''}`}
      style={{ width: s.box, height: s.box, borderRadius: s.radius, background: c + '22' }}
    >
      <Icon size={s.icon} style={{ color: c }} strokeWidth={2} />
    </div>
  )
}
