import { describe, expect, it } from 'vitest'
import { CATEGORIES } from '@/lib/categories/catalog'

// Categorías que usa la integración Edenred. Deben existir en el catálogo
// (lib/categories/catalog.ts, fuente única de la tabla `categories`), porque
// `transactions.category` tiene FK a `categories.id` (#174): un `id` desconocido
// haría fallar el insert de la tx. Además la analítica (`get_period_data`) hace
// LEFT JOIN sobre `categories`, así que un id sin fila quedaría sin metadatos de
// categoría en las agregaciones. Ver #101.
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
