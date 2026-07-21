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

  it('agrupa las categorías por debajo del umbral en el bucket "Resto"', () => {
    // clothing y charity ≈ 2% cada una → Resto (hacen falta dos: con una sola no se agrupa)
    const { slices } = buildDonutModel(
      [bc('groceries', -100), bc('clothing', -2), bc('charity', -2)],
      'expense',
      104,
    )
    expect(slices.some(s => s.key === REST_KEY)).toBe(true)
    expect(slices.some(s => s.categoryId === 'clothing')).toBe(false)
    expect(slices.some(s => s.categoryId === 'charity')).toBe(false)
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

describe('buildDonutModel: detalle del bucket "Resto" (#345)', () => {
  // Escenario de la issue: una categoría domina (~60%) y la cola cae bajo el umbral.
  // Los importes dejan un hueco amplio a ambos lados de MIN_PCT (cabeza ≥10%, cola ≤2,5%)
  // para que los tests no se rompan si se reajusta el umbral.
  const dominant = () => buildDonutModel(
    [
      bc('mortgage', -600),
      bc('groceries', -200),
      bc('restaurant', -125),
      bc('sports', -25),
      bc('charity', -20),
      bc('pharmacy', -18),
      bc('fees', -12),
    ],
    'expense',
    1000,
  )

  it('restRows expone las categorías agrupadas, orden desc, para desplegarlas en la lista', () => {
    const { slices, restRows } = dominant()

    // sports 2,5% / charity 2% / pharmacy 1,8% / fees 1,2% → bajo MIN_PCT
    expect(restRows.map(r => r.categoryId)).toEqual(['sports', 'charity', 'pharmacy', 'fees'])
    for (const row of restRows) {
      expect(slices.some(s => s.categoryId === row.categoryId)).toBe(false)
    }
  })

  it('el bucket reconcilia con las filas que despliega', () => {
    const { slices, restRows } = dominant()
    const restSlice = at(slices.filter(s => s.key === REST_KEY), 0, 'bucket Resto')

    expect(restSlice.amount).toBeCloseTo(restRows.reduce((s, r) => s + r.amount, 0), 2)
    expect(restSlice.pct).toBeCloseTo(restRows.reduce((s, r) => s + r.pct, 0), 6)
  })

  it('los porcentajes de restRows son sobre el gasto bruto, como los del anillo', () => {
    const { restRows, grossSpend } = dominant()
    const fees = at(restRows.filter(r => r.categoryId === 'fees'), 0, 'fila de comisiones')
    expect(fees.pct).toBeCloseTo((12 / grossSpend) * 100, 6)
  })

  it('sin cola: ni bucket "Resto" ni restRows', () => {
    const { slices, restRows } = buildDonutModel(
      [bc('mortgage', -600), bc('groceries', -400)],
      'expense',
      1000,
    )
    expect(restRows).toEqual([])
    expect(slices.some(s => s.key === REST_KEY)).toBe(false)
  })

  it('una sola categoría bajo el umbral va como porción propia, sin bucket', () => {
    const { slices, restRows } = buildDonutModel(
      [bc('groceries', -100), bc('clothing', -2)], // clothing ≈ 2%
      'expense',
      102,
    )
    expect(restRows).toEqual([])
    expect(slices.some(s => s.key === REST_KEY)).toBe(false)
    expect(slices.some(s => s.categoryId === 'clothing')).toBe(true)
  })

  it('los créditos no entran en el bucket', () => {
    const { restRows, credits } = buildDonutModel(
      [bc('mortgage', -600), bc('clothing', -12), bc('sports', -12), bc('groceries', 18.55)],
      'expense',
      605.45,
    )
    expect(credits.map(c => c.categoryId)).toEqual(['groceries'])
    expect(restRows.map(r => r.categoryId)).toEqual(['clothing', 'sports'])
  })
})
