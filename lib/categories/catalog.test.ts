import { describe, expect, it } from 'vitest'
import { CATEGORIES, CATEGORY_COLORS, CATEGORY_META, VALID_CATEGORIES } from './catalog'

describe('invariantes del catálogo de categorías', () => {
  it('tiene 45 categorías: 36 expense, 4 income, 5 non_computable', () => {
    expect(CATEGORIES).toHaveLength(45)
    const count = (type: string) => CATEGORIES.filter((c) => c.type === type).length
    expect(count('expense')).toBe(36)
    expect(count('income')).toBe(4)
    expect(count('non_computable')).toBe(5)
  })

  it('los ids son únicos', () => {
    const ids = CATEGORIES.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('los sortOrder son únicos', () => {
    const orders = CATEGORIES.map((c) => c.sortOrder)
    expect(new Set(orders).size).toBe(orders.length)
  })

  it('los colores son hex de 6 dígitos', () => {
    for (const c of CATEGORIES) {
      expect(c.color, c.id).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it('las derivaciones cubren todas las categorías', () => {
    expect(Object.keys(CATEGORY_META)).toHaveLength(CATEGORIES.length)
    expect(Object.keys(CATEGORY_COLORS)).toHaveLength(CATEGORIES.length)
    expect(VALID_CATEGORIES).toHaveLength(CATEGORIES.length)
  })

  // Lista exacta de ids con su type: detecta altas, bajas o cambios de tipo
  // accidentales. Si el cambio es intencionado, actualizar también la BD
  // (`pnpm seed:categories` + SQL Editor) y, si hay renombres/bajas, una
  // migración de repunte (ver #151/#174).
  it('la lista de ids y tipos es la esperada', () => {
    expect(CATEGORIES.map((c) => `${c.id}:${c.type}`)).toEqual([
      'groceries:expense', 'restaurant:expense', 'transport:expense',
      'fuel:expense', 'parking:expense', 'vehicle:expense',
      'mortgage:expense', 'community_fees:expense', 'electricity:expense',
      'gas:expense', 'water:expense', 'internet:expense', 'home:expense',
      'clothing:expense', 'shopping:expense', 'electronics:expense',
      'health:expense', 'pharmacy:expense', 'leisure:expense',
      'sports:expense', 'subscriptions:expense', 'travel:expense',
      'education:expense', 'insurance_health:expense', 'insurance_home:expense',
      'insurance_auto:expense', 'domestic_help:expense', 'beauty:expense',
      'gifts:expense', 'charity:expense', 'memberships:expense',
      'taxes:expense', 'loans:expense', 'cash:expense', 'fees:expense',
      'other:expense',
      'payroll:income', 'returns:income', 'reimbursement:income',
      'other_income:income',
      'investment:non_computable', 'savings:non_computable',
      'transfer:non_computable', 'loan_payment:non_computable',
      'card_payment:non_computable',
    ])
  })
})
