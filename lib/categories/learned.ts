import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import type { CategoryId } from './catalog'
import { descriptionKey, descriptionKeyRoot, KEY_STOPLIST } from './normalize'

/**
 * Reglas de categorización aprendidas de las correcciones del usuario (issue #359).
 *
 * No hay tabla de reglas aprendidas ni modelo entrenado: la «tabla» son los propios
 * movimientos que el usuario ya corrigió a mano, y el RPC `get_learned_categories`
 * los agrega en el momento (voto por mayoría por clave de comercio, ponderado por
 * recencia). Este módulo se ocupa de traer ese resultado y decidir de qué votos
 * fiarse.
 */

/** Una fila de `get_learned_categories`: la categoría ganadora de una clave. */
export type LearnedRule = {
  key: string
  /** `exact` = clave completa (`mercadona sant boi`); `root` = raíz (`mercadona`). */
  level: 'exact' | 'root'
  categoryId: string
  /** Nº de correcciones manuales que respaldan la regla. */
  n: number
  /** Peso del ganador sobre el total, en [0, 1]. */
  confidence: number
}

/**
 * Confianza mínima para aplicar una regla aprendida. Por debajo, el hogar no tiene
 * un criterio claro sobre ese comercio y es preferible no categorizar a categorizar
 * mal: dejarlo en blanco se ve y se corrige; una categoría errónea se cuela en el
 * análisis sin que nadie la mire.
 */
export const MIN_CONFIDENCE = 0.6

/**
 * Una sola corrección basta para aprender (con n = 1 la confianza es 1,0). Es lo
 * que hace que el criterio de aceptación «corregir un movimiento hace que los
 * futuros del mismo comercio entren ya con esa categoría» se cumpla sin pedirle al
 * usuario que corrija lo mismo tres veces.
 */
export const MIN_SAMPLES = 1

export type LearnedIndex = {
  byKey: ReadonlyMap<string, CategoryId>
  byRoot: ReadonlyMap<string, CategoryId>
}

export const EMPTY_LEARNED_INDEX: LearnedIndex = { byKey: new Map(), byRoot: new Map() }

/**
 * Convierte las filas del RPC en los dos mapas que consulta la categorización,
 * descartando lo que no llega al umbral.
 *
 * La stoplist se vuelve a aplicar aquí aunque las claves genéricas ya nacen a NULL
 * en `normalize.ts`: es barato y protege de las filas que quedaran escritas con una
 * versión anterior de la tubería.
 */
export function buildLearnedIndex(rules: LearnedRule[]): LearnedIndex {
  const byKey = new Map<string, CategoryId>()
  const byRoot = new Map<string, CategoryId>()

  for (const rule of rules) {
    if (rule.n < MIN_SAMPLES) continue
    if (rule.confidence < MIN_CONFIDENCE) continue
    if (!rule.key || KEY_STOPLIST.has(rule.key)) continue
    const target = rule.level === 'root' ? byRoot : byKey
    target.set(rule.key, rule.categoryId as CategoryId)
  }

  return { byKey, byRoot }
}

/**
 * Categoría aprendida para un descriptor, o `null`.
 *
 * Se consulta la clave exacta primero y la raíz como respaldo: la exacta es más
 * precisa (`mercadona sant boi`) y la raíz es la que da el recall que hace que
 * corregir un Mercadona arregle los de todas las ciudades.
 */
export function lookupLearned(index: LearnedIndex, description: string): CategoryId | null {
  const key = descriptionKey(description)
  if (!key) return null

  const exact = index.byKey.get(key)
  if (exact) return exact

  const root = descriptionKeyRoot(key)
  return root ? index.byRoot.get(root) ?? null : null
}

/**
 * Trae las reglas aprendidas del hogar.
 *
 * Tolerante a fallo por diseño (mismo criterio que la carga de
 * `categorization_rules` en los tres puntos de ingesta): si el RPC falla, se
 * devuelve el índice vacío y la categorización se degrada a la cascada de siempre
 * —reglas explícitas y `AUTO_RULES`—, en vez de tumbar la sincronización entera.
 */
export async function loadLearnedIndex(
  db: SupabaseClient<Database>,
  householdId: string
): Promise<LearnedIndex> {
  const { data, error } = await db.rpc('get_learned_categories', {
    p_household_id: householdId,
  })

  if (error) {
    console.warn('[loadLearnedIndex] reglas aprendidas no disponibles:', error.message)
    return EMPTY_LEARNED_INDEX
  }

  return buildLearnedIndex(
    (data ?? []).map(row => ({
      key: row.key,
      level: row.level === 'root' ? 'root' : 'exact',
      categoryId: row.category_id,
      n: row.n,
      confidence: Number(row.confidence),
    }))
  )
}
