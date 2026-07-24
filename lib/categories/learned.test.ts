import { describe, expect, it } from 'vitest'
import {
  buildLearnedIndex,
  lookupLearned,
  MIN_CONFIDENCE,
  type LearnedRule,
} from './learned'

const rule = (partial: Partial<LearnedRule> & Pick<LearnedRule, 'key'>): LearnedRule => ({
  level: 'exact',
  categoryId: 'groceries',
  n: 3,
  confidence: 1,
  ...partial,
})

describe('buildLearnedIndex', () => {
  it('separa los dos niveles en mapas distintos', () => {
    const index = buildLearnedIndex([
      rule({ key: 'mercadona sant boi', level: 'exact' }),
      rule({ key: 'mercadona', level: 'root' }),
    ])

    expect(index.byKey.get('mercadona sant boi')).toBe('groceries')
    expect(index.byRoot.get('mercadona')).toBe('groceries')
    expect(index.byKey.has('mercadona')).toBe(false)
  })

  it('descarta las reglas por debajo del umbral de confianza', () => {
    const index = buildLearnedIndex([
      rule({ key: 'amazon', confidence: MIN_CONFIDENCE - 0.01 }),
    ])
    expect(index.byKey.size).toBe(0)
  })

  it('acepta una regla justo en el umbral', () => {
    const index = buildLearnedIndex([rule({ key: 'amazon', confidence: MIN_CONFIDENCE })])
    expect(index.byKey.get('amazon')).toBe('groceries')
  })

  it('una sola corrección basta para aprender', () => {
    const index = buildLearnedIndex([rule({ key: 'glovo', n: 1, confidence: 1 })])
    expect(index.byKey.get('glovo')).toBe('groceries')
  })

  it('descarta las claves genéricas aunque el RPC las devuelva', () => {
    // Escritas por una versión anterior de la tubería de normalización.
    const index = buildLearnedIndex([rule({ key: 'varios' }), rule({ key: 'cajero' })])
    expect(index.byKey.size).toBe(0)
  })
})

describe('lookupLearned', () => {
  const index = buildLearnedIndex([
    rule({ key: 'mercadona sant boi', level: 'exact', categoryId: 'restaurant' }),
    rule({ key: 'mercadona', level: 'root', categoryId: 'groceries' }),
  ])

  it('la clave exacta gana a la raíz', () => {
    expect(lookupLearned(index, 'COMPRA TARJ. 4106 MERCADONA (SANT BOI) 12/03')).toBe('restaurant')
  })

  it('cae a la raíz cuando no hay clave exacta (otra ciudad)', () => {
    expect(lookupLearned(index, 'COMPRA TARJ. 4106 MERCADONA (BARCELONA)')).toBe('groceries')
  })

  it('null cuando el descriptor no tiene señal', () => {
    expect(lookupLearned(index, 'TRANSFERENCIA')).toBeNull()
  })

  it('null cuando no hay nada aprendido de ese comercio', () => {
    expect(lookupLearned(index, 'COMPRA TARJ. 4106 LIDL (GAVA)')).toBeNull()
  })
})
