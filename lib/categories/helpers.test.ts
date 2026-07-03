import { describe, expect, it } from 'vitest'
import { CATEGORY_META } from './catalog'
import { getCategoryMeta, getEffectiveCategory } from './helpers'

describe('getEffectiveCategory', () => {
  it('devuelve null cuando category y category_manual son null', () => {
    expect(getEffectiveCategory({ category: null, category_manual: null })).toBeNull()
  })

  it('usa category cuando no hay override manual', () => {
    expect(getEffectiveCategory({ category: 'groceries', category_manual: null })).toBe('groceries')
  })

  it('category_manual tiene precedencia sobre category', () => {
    expect(getEffectiveCategory({ category: 'groceries', category_manual: 'restaurant' })).toBe('restaurant')
  })

  it('devuelve null ante un id inválido (p. ej. renombrado en migración), no lo cuela', () => {
    expect(getEffectiveCategory({ category: 'old_food', category_manual: null })).toBeNull()
    expect(getEffectiveCategory({ category: 'groceries', category_manual: 'legacy_id' })).toBeNull()
  })
})

describe('getCategoryMeta', () => {
  it('devuelve los metadatos del id válido', () => {
    expect(getCategoryMeta('groceries')).toBe(CATEGORY_META.groceries)
  })

  it('degrada a "other" ante un id desconocido', () => {
    expect(getCategoryMeta('unknown_id')).toBe(CATEGORY_META.other)
  })

  it('degrada a "other" ante null/undefined', () => {
    expect(getCategoryMeta(null)).toBe(CATEGORY_META.other)
    expect(getCategoryMeta(undefined)).toBe(CATEGORY_META.other)
  })
})
