import { MoreHorizontal } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { CategoryBreakdown, CategoryId } from '@/types'
import { CATEGORY_META } from '@/lib/theme'
import { getCategoryMeta } from '@/lib/categories'
import type { DonutItem } from './DonutChart'

// Categorías por debajo de este % del gasto bruto se agrupan en "Resto" — sólo en el anillo.
export const MIN_PCT = 3
export const REST_KEY = '__rest__'
const REST_COLOR = '#94a3b8'

/** Categoría con neto de signo contrario a su tipo (gasto con reembolso neto / ingreso con devolución neta). */
export interface CreditRow {
  categoryId: CategoryId
  label: string
  color: string
  Icon: LucideIcon
  amount: number // magnitud del neto (positiva); se muestra como crédito que reduce el total
}

/** Fila de una categoría real de la lista; nunca el bucket "Resto". */
export type CategoryRow = DonutItem & { categoryId: CategoryId }

export interface DonutModel {
  /** Categorías por encima del umbral más el bucket "Resto": porciones del anillo y filas de la lista. */
  slices: DonutItem[]
  /**
   * Categorías absorbidas por el bucket "Resto", orden desc por importe. La lista las
   * despliega bajo la fila "Resto" para que ninguna quede inalcanzable (#345); vacío si
   * no se llegó a agrupar.
   */
  restRows: CategoryRow[]
  /** Categorías con neto de signo contrario (reembolsos): filas de crédito, sin anillo ni barra. */
  credits: CreditRow[]
  /** Total neto del tipo (= KPI). Es el "Total" central del donut (#272). */
  netTotal: number
  /** Σ magnitudes de `slices`; base de los porcentajes del anillo. */
  grossSpend: number
}

/**
 * Construye el modelo del donut para un tipo, con la semántica neta del spec §5.4 (#272):
 * el anillo reparte el gasto/ingreso bruto de las categorías en la dirección del tipo, el
 * centro muestra el neto (= KPI), y las categorías de signo contrario se separan como créditos.
 * Reconciliación: `grossSpend − Σ|credit| = netTotal` (mientras el neto no invierta de signo).
 */
export function buildDonutModel(
  byCategory: CategoryBreakdown[],
  type: 'income' | 'expense',
  netTotal: number,
): DonutModel {
  // Dirección "correcta" del tipo: gasto = neto negativo, ingreso = neto positivo.
  const isSpend = (net: number) => (type === 'expense' ? net < 0 : net > 0)

  const cats = byCategory.filter(
    (bc): bc is { category: CategoryId; amount: number } =>
      bc.category !== null && bc.amount !== 0 && CATEGORY_META[bc.category]?.type === type,
  )

  const toMagnitude = (c: { category: CategoryId; amount: number }) => ({
    category: c.category,
    amount: Math.abs(c.amount),
  })

  const spendCats = cats.filter(c => isSpend(c.amount)).map(toMagnitude).sort((a, b) => b.amount - a.amount)
  const creditCats = cats.filter(c => !isSpend(c.amount)).map(toMagnitude).sort((a, b) => b.amount - a.amount)

  const grossSpend = spendCats.reduce((s, c) => s + c.amount, 0)

  const withPct = spendCats.map(c => ({
    ...c,
    pct: grossSpend > 0 ? (c.amount / grossSpend) * 100 : 0,
  }))
  const toRow = (c: (typeof withPct)[number]): CategoryRow => {
    const meta = getCategoryMeta(c.category)
    return {
      key: c.category,
      categoryId: c.category,
      label: meta.label,
      color: meta.color,
      Icon: meta.Icon,
      amount: c.amount,
      pct: c.pct,
    }
  }

  const rows = withPct.map(toRow) // ya ordenadas desc por importe

  const main = rows.filter(c => c.pct >= MIN_PCT)
  const rest = rows.filter(c => c.pct < MIN_PCT)
  // Con una sola categoría en la cola no se agrupa: el bucket ocuparía exactamente el
  // mismo arco que la categoría y sólo escondería su nombre.
  const grouped = rest.length > 1

  const slices: DonutItem[] = grouped
    ? [
        ...main,
        {
          key: REST_KEY,
          categoryId: null,
          label: 'Resto',
          color: REST_COLOR,
          Icon: MoreHorizontal,
          amount: rest.reduce((s, c) => s + c.amount, 0),
          pct: rest.reduce((s, c) => s + c.pct, 0),
        } satisfies DonutItem,
      ]
    : rows

  const credits: CreditRow[] = creditCats.map(c => {
    const meta = getCategoryMeta(c.category)
    return { categoryId: c.category, label: meta.label, color: meta.color, Icon: meta.Icon, amount: c.amount }
  })

  return {
    slices,
    restRows: grouped ? rest : [],
    credits,
    netTotal,
    grossSpend,
  }
}
