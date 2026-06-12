// Genera supabase/seed/categories.sql desde el catálogo único de categorías.
// Uso: pnpm seed:categories (Node ≥ 22.18 — type stripping nativo de TS).

import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CATEGORIES } from '../lib/categories/catalog.ts'
import { renderCategoriesSeedSql } from '../lib/categories/seed-sql.ts'

const outFile = join(dirname(fileURLToPath(import.meta.url)), '..', 'supabase', 'seed', 'categories.sql')

mkdirSync(dirname(outFile), { recursive: true })
writeFileSync(outFile, renderCategoriesSeedSql(CATEGORIES), 'utf8')
console.log(`Seed generado: ${outFile} (${CATEGORIES.length} categorías)`)
