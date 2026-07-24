import type { CategoryId } from './catalog'
import { lookupLearned, type LearnedIndex } from './learned'
import {
  categorize,
  validateRulePattern,
  MAX_TARGET_LENGTH,
  type DbCategorizationRule,
} from './rules'

/**
 * Cascada de categorización (issue #359).
 *
 * La decisión deja de ser una función monolítica y pasa a ser una lista ordenada de
 * proveedores; se devuelve el primero que acierta:
 *
 *   category_manual        (humano — no llega hasta aquí, es intocable)
 *         ↓
 *   reglas explícitas      categorization_rules
 *         ↓
 *   reglas APRENDIDAS      de las correcciones del hogar
 *         ↓
 *   AUTO_RULES estáticas   lib/categories/rules.ts
 *         ↓
 *   null
 *
 * Aquí está la puerta abierta: los peldaños siguientes de la escalera (parecido
 * difuso con pg_trgm, voto por palabras, IA como sugerencia) entran como proveedores
 * nuevos en la lista, no como una reescritura de esto.
 */

/** De dónde salió la categoría. Se propagará a la UI cuando exista `category_source`. */
export type CategorySource = 'explicit' | 'learned' | 'static'

export type CategorizeInput = {
  description: string
  /** Sólo Enable Banking lo emite; las reglas explícitas pueden casar contra él. */
  merchant?: string
}

export type CategoryMatch = { categoryId: CategoryId; source: CategorySource }

export type CategoryProvider = (input: CategorizeInput) => CategoryMatch | null

/**
 * Reglas explícitas del hogar (`categorization_rules`), en el orden de prioridad en
 * que vengan de la consulta.
 *
 * Tolerante a fallo: una regla inválida o con riesgo de ReDoS se OMITE en vez de
 * colgar el sync (issue #182). La validez se comprueba con el mismo validador que
 * usará la UI de gestión de reglas.
 */
export function explicitRulesProvider(dbRules: DbCategorizationRule[]): CategoryProvider {
  return ({ description, merchant }) => {
    for (const rule of dbRules) {
      const validation = validateRulePattern(rule.pattern)
      if (!validation.ok) {
        console.warn(`[explicitRulesProvider] regla omitida (${validation.reason})`)
        continue
      }
      const rawTarget = rule.field === 'merchant' ? (merchant ?? '') : description
      const target = rawTarget.slice(0, MAX_TARGET_LENGTH)
      if (target && new RegExp(rule.pattern, 'i').test(target)) {
        return { categoryId: rule.category_id as CategoryId, source: 'explicit' }
      }
    }
    return null
  }
}

/**
 * Lo aprendido de las correcciones del hogar.
 *
 * Casa siempre contra `description`, nunca contra `merchant`: `merchant` es mejor
 * señal pero no se persiste en `transactions`, así que usarlo aquí y `description`
 * en el backfill produciría claves distintas para el mismo comercio a ambos lados
 * del corte. Determinismo por encima de precisión marginal.
 */
export function learnedProvider(index: LearnedIndex): CategoryProvider {
  return ({ description }) => {
    const categoryId = lookupLearned(index, description)
    return categoryId ? { categoryId, source: 'learned' } : null
  }
}

/** Las ~45 regex de `AUTO_RULES`, iguales para todos los hogares. */
export function staticRulesProvider(): CategoryProvider {
  return ({ description, merchant }) => {
    const categoryId = categorize(description, merchant)
    return categoryId ? { categoryId, source: 'static' } : null
  }
}

/** Compone una lista de proveedores: gana el primero que devuelve algo. */
export function buildCategorizer(providers: CategoryProvider[]) {
  return (input: CategorizeInput): CategoryMatch | null => {
    for (const provider of providers) {
      const match = provider(input)
      if (match) return match
    }
    return null
  }
}

/**
 * La cascada completa, en la forma que consume la ingesta: sólo el id de categoría.
 * Es lo que sustituye al antiguo `categorizeWithRules`.
 */
export function defaultCategorizer(args: {
  dbRules: DbCategorizationRule[]
  learned: LearnedIndex
}) {
  const match = buildCategorizer([
    explicitRulesProvider(args.dbRules),
    learnedProvider(args.learned),
    staticRulesProvider(),
  ])
  return (input: CategorizeInput): CategoryId | null => match(input)?.categoryId ?? null
}
