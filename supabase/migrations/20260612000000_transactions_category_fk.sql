-- =============================================================================
-- FK transactions.category / category_manual → categories.id (issue #175)
-- =============================================================================
-- Cierra el agujero de transacciones huérfanas: hasta ahora un id de categoría
-- inexistente no daba error y la transacción desaparecía en silencio de
-- Análisis (INNER JOIN de la matview, ver #101).
--
-- Decisión: ON DELETE NO ACTION (default) en vez de SET NULL — fail-fast.
-- Borrar una categoría aún referenciada debe fallar y forzar el patrón
-- alta→repunte→baja (ver #151 y #174), no descategorizar en silencio.
-- Consistente con la FK existente de categorization_rules.category_id.
--
-- PRERREQUISITO: ejecutar antes supabase/seed/categories.sql (estado canónico
-- del catálogo), para que ninguna categoría en uso quede fuera de `categories`.
-- Ejecutar en Supabase SQL Editor como un único bloque.

-- 1. Limpieza de huérfanas (hoy ya invisibles en Análisis por el INNER JOIN)
UPDATE transactions t SET category = NULL
WHERE  category IS NOT NULL
  AND  NOT EXISTS (SELECT 1 FROM categories c WHERE c.id = t.category);

UPDATE transactions t SET category_manual = NULL
WHERE  category_manual IS NOT NULL
  AND  NOT EXISTS (SELECT 1 FROM categories c WHERE c.id = t.category_manual);

-- 2. FKs
ALTER TABLE transactions
  ADD CONSTRAINT transactions_category_fkey
    FOREIGN KEY (category) REFERENCES categories(id),
  ADD CONSTRAINT transactions_category_manual_fkey
    FOREIGN KEY (category_manual) REFERENCES categories(id);

-- 3. Índices de soporte para el chequeo referencial al borrar categorías
CREATE INDEX IF NOT EXISTS transactions_category_idx
  ON transactions (category);
CREATE INDEX IF NOT EXISTS transactions_category_manual_idx
  ON transactions (category_manual);

-- 4. Refrescar analítica (la limpieza del paso 1 no altera los agregados —las
-- huérfanas ya estaban excluidas—, pero se refresca por consistencia)
REFRESH MATERIALIZED VIEW transactions_monthly_summary;
