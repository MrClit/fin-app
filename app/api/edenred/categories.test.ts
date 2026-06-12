import { describe, expect, it } from 'vitest'
import { CATEGORIES } from '@/lib/categories/catalog'

// Categorías que usa la integración Edenred. Deben existir en el catálogo
// (lib/categories/catalog.ts, fuente única de la tabla `categories`), porque
// la matview `transactions_monthly_summary` hace INNER JOIN sobre `categories`:
// un `id` desconocido excluiría la tx de las agregaciones SIN error. Ver #101.
// El scraper `scripts/scrapers/edenred/scrape.mjs` emite estos ids sin tipado,
// por eso este test los protege explícitamente.
// - 'restaurant': consumo (fallback del webhook en route.ts)
// - 'payroll':    recarga / top-up (RECARGA en scripts/scrapers/edenred/scrape.mjs)
const EDENRED_CATEGORIES = ['restaurant', 'payroll'] as const

describe('dependencia de categorías Edenred ↔ catálogo', () => {
  it.each(EDENRED_CATEGORIES)(
    'la categoría "%s" que emite Edenred existe en el catálogo',
    (category) => {
      expect(CATEGORIES.some((c) => c.id === category)).toBe(true)
    }
  )
})
