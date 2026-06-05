import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// Categorías que usa la integración Edenred. Deben coincidir con un `id`
// sembrado en la tabla `categories`, porque la matview
// `transactions_monthly_summary` hace INNER JOIN sobre `categories`: un `id`
// desconocido excluiría la tx de las agregaciones SIN error. Ver issue #101.
// - 'restaurant': consumo (fallback del webhook en route.ts)
// - 'income':     recarga / top-up (RECARGA en scripts/edenred-scrape.mjs)
const EDENRED_CATEGORIES = ['restaurant', 'income'] as const

const SEED_PATH = fileURLToPath(
  new URL(
    '../../../supabase/migrations/20260509000000_categories_type.sql',
    import.meta.url
  )
)

function seededCategoryIds(): Set<string> {
  const sql = readFileSync(SEED_PATH, 'utf8')
  // Cada fila del INSERT empieza con `  ('<id>', ...`
  const ids = new Set<string>()
  for (const match of sql.matchAll(/^\s*\(\s*'([a-z_]+)'\s*,/gm)) {
    ids.add(match[1])
  }
  return ids
}

describe('dependencia de categorías Edenred ↔ seed de `categories`', () => {
  it('el seed contiene varias categorías (sanity del parser)', () => {
    expect(seededCategoryIds().size).toBeGreaterThan(10)
  })

  it.each(EDENRED_CATEGORIES)(
    'la categoría "%s" que emite Edenred existe en el seed',
    category => {
      expect(seededCategoryIds().has(category)).toBe(true)
    }
  )
})
