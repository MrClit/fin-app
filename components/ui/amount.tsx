import { fmt } from '@/lib/formatting'
import { getEffectiveType } from '@/lib/categories'
import { cn } from '@/lib/utils'

// Punto único de verdad de la clase de cifras tabulares. Reutilizable en sitios que no
// pueden renderizar el componente <Amount> (strings, SVG, tooltips de chart).
export const TABULAR_NUMS = 'tabular-nums [font-variant-numeric:tabular-nums_slashed-zero]'

/**
 * Clase de color de un importe según el TIPO de su categoría efectiva (no el signo):
 * ingresos en verde, gastos en rojo, no computables y sin categoría en neutro. Punto
 * único de verdad para colorear importes de forma coherente en lista, modal, etc.
 */
export function amountColorClass(
  tx: { category: string | null; category_manual: string | null }
): string {
  switch (getEffectiveType(tx)) {
    case 'income':
      return 'text-positive'
    case 'expense':
      return 'text-negative'
    default:
      return 'text-foreground' // non_computable | sin categoría
  }
}

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
