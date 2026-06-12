// Renderiza el SQL de sincronización de la tabla `categories` a partir del
// catálogo. Función pura (sin fs): la usan el generador
// `scripts/generate-categories-seed.mts` y el test de drift
// `lib/categories/seed-sql.test.ts`.

import type { CategoryType } from './catalog'

interface SeedCategory {
  id: string
  label: string
  color: string
  type: CategoryType
  sortOrder: number
}

const sqlString = (value: string): string => `'${value.replace(/'/g, "''")}'`

export function renderCategoriesSeedSql(categories: readonly SeedCategory[]): string {
  const values = categories
    .map(
      (c) =>
        `  (${sqlString(c.id)}, ${sqlString(c.label)}, ${sqlString(c.color)}, ${sqlString(c.type)}, ${c.sortOrder})`
    )
    .join(',\n')

  const ids = categories.map((c) => sqlString(c.id)).join(', ')

  return `-- GENERATED FILE — no editar a mano. Regenerar con: pnpm seed:categories
-- Sincroniza la tabla \`categories\` con lib/categories/catalog.ts (fuente única, issue #175).
-- Ejecutar en el Supabase SQL Editor como un único bloque cada vez que cambie el catálogo.
--
-- El DELETE final fallará por FK si una categoría retirada aún tiene transacciones
-- o reglas asociadas: en ese caso hace falta antes una migración de repunte
-- (patrón alta→repunte→baja, ver #151 y #174).

INSERT INTO categories (id, name, color, type, sort_order) VALUES
${values}
ON CONFLICT (id) DO UPDATE
  SET name       = EXCLUDED.name,
      color      = EXCLUDED.color,
      type       = EXCLUDED.type,
      sort_order = EXCLUDED.sort_order;

DELETE FROM categories
WHERE id NOT IN (${ids});

REFRESH MATERIALIZED VIEW transactions_monthly_summary;
`
}
