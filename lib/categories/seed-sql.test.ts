import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { CATEGORIES } from './catalog'
import { renderCategoriesSeedSql } from './seed-sql'

const SEED_PATH = fileURLToPath(
  new URL('../../supabase/seed/categories.sql', import.meta.url)
)

describe('sincronía catálogo ↔ supabase/seed/categories.sql', () => {
  // Candado anti-drift: si el catálogo cambia sin regenerar el seed
  // (`pnpm seed:categories`), este test falla.
  it('el seed commiteado coincide byte a byte con el generado desde el catálogo', () => {
    const committed = readFileSync(SEED_PATH, 'utf8')
    expect(committed).toBe(renderCategoriesSeedSql(CATEGORIES))
  })

  it('escapa comillas simples en los labels', () => {
    const sql = renderCategoriesSeedSql([
      { id: 'test', label: "L'Hospitalet", color: '#000000', type: 'expense', sortOrder: 1 },
    ])
    expect(sql).toContain("'L''Hospitalet'")
  })
})
