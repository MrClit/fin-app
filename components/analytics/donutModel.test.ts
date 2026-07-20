import { describe, expect, it } from 'vitest'
import type { CategoryBreakdown } from '@/types'
import { buildDonutModel, REST_KEY } from './donutModel'
import { at } from '@/tests/helpers'

const bc = (category: string | null, amount: number): CategoryBreakdown =>
  ({ category, amount } as CategoryBreakdown)

describe('buildDonutModel (#272)', () => {
  it('separa la categoría de reembolso (gasto con neto positivo) como crédito, no como slice', () => {
    // Escenario Julio 2026: groceries con neto +18,55 (reembolsos > compras).
    const netTotal = 189.12 // = KPI (|Σ net|)
    const { slices, credits, grossSpend, netTotal: center } = buildDonutModel(
      [
        bc('community_fees', -65),
        bc('beauty', -56),
        bc('taxes', -36.67),
        bc('sports', -25),
        bc('groceries', 18.55),
        bc('charity', -18),
        bc('clothing', -7),
      ],
      'expense',
      netTotal,
    )

    // groceries es crédito, no aparece en el anillo
    expect(credits.map(c => c.categoryId)).toEqual(['groceries'])
    expect(at(credits, 0).amount).toBeCloseTo(18.55, 2)
    expect(slices.find(s => s.categoryId === 'groceries')).toBeUndefined()

    // El centro es el neto (= KPI); el anillo reparte el gasto bruto
    expect(center).toBeCloseTo(189.12, 2)
    expect(grossSpend).toBeCloseTo(207.67, 2)

    // Reconciliación: grossSpend − Σ|credit| = netTotal
    const totalCredit = credits.reduce((s, c) => s + c.amount, 0)
    expect(grossSpend - totalCredit).toBeCloseTo(center, 2)
  })

  it('caso normal (sin reembolsos): sin créditos y grossSpend = Σ|net|', () => {
    const { slices, credits, grossSpend } = buildDonutModel(
      [bc('groceries', -100), bc('restaurant', -50)],
      'expense',
      150,
    )
    expect(credits).toEqual([])
    expect(grossSpend).toBeCloseTo(150, 2)
    expect(slices.some(s => s.categoryId === 'groceries')).toBe(true)
  })

  it('agrupa categorías pequeñas (<5%) en el bucket "Resto"', () => {
    const { slices } = buildDonutModel(
      [bc('groceries', -100), bc('clothing', -2)], // clothing 2/102 ≈ 2% → Resto
      'expense',
      102,
    )
    expect(slices.some(s => s.key === REST_KEY)).toBe(true)
    expect(slices.some(s => s.categoryId === 'clothing')).toBe(false)
  })

  it('vista ingresos: una categoría de ingreso con neto negativo (devolución) es crédito', () => {
    const { slices, credits } = buildDonutModel(
      [bc('payroll', 1000), bc('other_income', -100)],
      'income',
      900,
    )
    expect(credits.map(c => c.categoryId)).toEqual(['other_income'])
    expect(slices.some(s => s.categoryId === 'payroll')).toBe(true)
  })
})
