import { describe, expect, it, vi } from 'vitest'
import {
  buildCategorizer,
  defaultCategorizer,
  explicitRulesProvider,
  learnedProvider,
  staticRulesProvider,
  type CategoryProvider,
} from './categorizer'
import { buildLearnedIndex, EMPTY_LEARNED_INDEX, type LearnedRule } from './learned'
import type { DbCategorizationRule } from './rules'

const learnedIndex = (rules: Partial<LearnedRule>[]) =>
  buildLearnedIndex(
    rules.map(r => ({
      key: 'mercadona',
      level: 'root',
      categoryId: 'groceries',
      n: 3,
      confidence: 1,
      ...r,
    })) as LearnedRule[]
  )

describe('buildCategorizer', () => {
  const hit = (id: string): CategoryProvider => () => ({ categoryId: id as never, source: 'static' })
  const miss: CategoryProvider = () => null

  it('devuelve el primer proveedor que acierta', () => {
    const match = buildCategorizer([miss, hit('groceries'), hit('restaurant')])
    expect(match({ description: 'x' })?.categoryId).toBe('groceries')
  })

  it('no consulta los proveedores posteriores al que acierta', () => {
    const later = vi.fn(miss)
    buildCategorizer([hit('groceries'), later])({ description: 'x' })
    expect(later).not.toHaveBeenCalled()
  })

  it('null cuando ninguno acierta', () => {
    expect(buildCategorizer([miss, miss])({ description: 'x' })).toBeNull()
  })
})

describe('cascada completa', () => {
  it('la regla explícita gana a la aprendida y a la estática', () => {
    const categorize = defaultCategorizer({
      dbRules: [{ pattern: 'mercadona', field: 'description', category_id: 'leisure' }],
      learned: learnedIndex([{ categoryId: 'restaurant' }]),
    })
    // Sin nada, "Mercadona" sería groceries por AUTO_RULES.
    expect(categorize({ description: 'Compra Mercadona (Sant Boi)' })).toBe('leisure')
  })

  it('la aprendida gana a la estática', () => {
    const categorize = defaultCategorizer({
      dbRules: [],
      learned: learnedIndex([{ categoryId: 'restaurant' }]),
    })
    expect(categorize({ description: 'Compra Mercadona (Sant Boi)' })).toBe('restaurant')
  })

  it('cae a la estática cuando no hay explícita ni aprendida', () => {
    const categorize = defaultCategorizer({ dbRules: [], learned: EMPTY_LEARNED_INDEX })
    expect(categorize({ description: 'Compra Mercadona' })).toBe('groceries')
  })

  it('null cuando ningún peldaño acierta', () => {
    const categorize = defaultCategorizer({ dbRules: [], learned: EMPTY_LEARNED_INDEX })
    expect(categorize({ description: 'pago xyz desconocido' })).toBeNull()
  })

  it('lo aprendido de un comercio no contamina a otro', () => {
    const categorize = defaultCategorizer({
      dbRules: [],
      learned: learnedIndex([{ categoryId: 'restaurant' }]),
    })
    expect(categorize({ description: 'Compra Lidl (Gava)' })).toBe('groceries')
  })
})

describe('learnedProvider', () => {
  it('casa por description aunque haya merchant (la clave se calcula de description)', () => {
    const provider = learnedProvider(learnedIndex([{ key: 'glovo', level: 'exact' }]))
    expect(provider({ description: 'PAGO GLOVO', merchant: 'Otro Comercio' })).toEqual({
      categoryId: 'groceries',
      source: 'learned',
    })
  })

  it('marca el origen como learned', () => {
    const provider = learnedProvider(learnedIndex([{ categoryId: 'restaurant' }]))
    expect(provider({ description: 'MERCADONA SANT BOI' })?.source).toBe('learned')
  })

  it('null con índice vacío', () => {
    expect(learnedProvider(EMPTY_LEARNED_INDEX)({ description: 'MERCADONA' })).toBeNull()
  })
})

describe('explicitRulesProvider (issue #182)', () => {
  it('omite una regla con riesgo de ReDoS y resuelve rápido', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const dbRules: DbCategorizationRule[] = [
      { pattern: '(a+)+$', field: 'description', category_id: 'shopping' },
    ]
    const malicious = 'a'.repeat(40) + '!'
    const start = performance.now()
    expect(explicitRulesProvider(dbRules)({ description: malicious })).toBeNull()
    expect(performance.now() - start).toBeLessThan(1000)
  })

  it('omite la regla inválida pero aplica el resto de reglas válidas', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const dbRules: DbCategorizationRule[] = [
      { pattern: '(', field: 'description', category_id: 'shopping' },
      { pattern: 'cafe-club', field: 'description', category_id: 'leisure' },
    ]
    expect(explicitRulesProvider(dbRules)({ description: 'pago en cafe-club' })).toEqual({
      categoryId: 'leisure',
      source: 'explicit',
    })
  })

  it('respeta el orden de prioridad recibido', () => {
    const dbRules: DbCategorizationRule[] = [
      { pattern: 'mercadona', field: 'description', category_id: 'restaurant' },
      { pattern: 'mercadona', field: 'description', category_id: 'shopping' },
    ]
    expect(explicitRulesProvider(dbRules)({ description: 'Compra Mercadona' })?.categoryId).toBe(
      'restaurant'
    )
  })

  it('casa contra merchant cuando la regla lo declara', () => {
    const dbRules: DbCategorizationRule[] = [
      { pattern: 'glovo', field: 'merchant', category_id: 'restaurant' },
    ]
    const provider = explicitRulesProvider(dbRules)
    expect(provider({ description: 'pago varios', merchant: 'GLOVO' })?.categoryId).toBe('restaurant')
    expect(provider({ description: 'pago varios' })).toBeNull()
  })
})

describe('staticRulesProvider', () => {
  it('marca el origen como static', () => {
    expect(staticRulesProvider()({ description: 'Compra Mercadona' })).toEqual({
      categoryId: 'groceries',
      source: 'static',
    })
  })
})
