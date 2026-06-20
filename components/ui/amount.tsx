import { fmt } from '@/lib/formatting'
import { cn } from '@/lib/utils'

// Punto único de verdad de la clase de cifras tabulares. Reutilizable en sitios que no
// pueden renderizar el componente <Amount> (strings, SVG, tooltips de chart).
export const TABULAR_NUMS = 'tabular-nums [font-variant-numeric:tabular-nums_slashed-zero]'

interface AmountProps {
  value: number
  /** Decimales a mostrar (por defecto 0, igual que fmt). */
  decimals?: number
  /** Añade el sufijo ' €' (por defecto true). */
  currency?: boolean
  /** Fuerza el '+' explícito en valores positivos (fmt ya pone '-' en negativos). */
  signed?: boolean
  className?: string
}

/**
 * Renderiza un importe monetario con cifras tabulares (alineación en columnas y ancho
 * estable al actualizarse). Hereda tamaño/peso/color del contenedor padre vía className.
 */
export function Amount({
  value,
  decimals = 0,
  currency = true,
  signed = false,
  className,
}: AmountProps) {
  const plus = signed && value > 0 ? '+' : ''
  return (
    <span className={cn(TABULAR_NUMS, className)}>
      {plus}
      {fmt(value, decimals)}
      {currency ? ' €' : ''}
    </span>
  )
}
