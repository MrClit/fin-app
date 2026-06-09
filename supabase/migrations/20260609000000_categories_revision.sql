-- Revisión del catálogo de categorías (Plan 1).
--
-- Altas (5):
--   · domestic_help    (Servicio doméstico)   — expense
--   · insurance_health (Seguro salud)         — expense   ┐ desglose del antiguo
--   · insurance_home   (Seguro hogar)         — expense   │ 'insurance' en sus
--   · insurance_auto   (Seguro auto)          — expense   ┘ tres ramos reales
--   · card_payment     (Pago tarjeta crédito) — non_computable
--       Liquidación de la VISA desde la cuenta corriente: no computable para
--       evitar el doble cómputo (las compras ya se contabilizan en la cuenta
--       de la tarjeta).
--
-- Baja (1):
--   · insurance (Seguros) — sustituida por el desglose salud/hogar/auto.
--
-- Mantener en sincronía con: types/index.ts (CategoryId),
-- lib/theme.ts (CATEGORY_META / CATEGORY_COLORS),
-- app/api/transactions/[id]/route.ts (VALID_CATEGORIES) y
-- lib/categories.ts (AUTO_RULES).
--
-- Ejecutar en Supabase SQL Editor como un único bloque.

-- ============================================================
-- 1. Altas
-- ============================================================
-- sort_order de categories no se usa para ordenar en la app (la UI ordena por
-- CATEGORY_META en lib/theme.ts), así que basta con valores distintos al final.
INSERT INTO categories (id, name, color, type, sort_order) VALUES
  ('domestic_help',    'Servicio doméstico',   '#14b8a6', 'expense',        42),
  ('insurance_health', 'Seguro salud',         '#84cc16', 'expense',        43),
  ('insurance_home',   'Seguro hogar',         '#0d9488', 'expense',        44),
  ('insurance_auto',   'Seguro auto',          '#65a30d', 'expense',        45),
  ('card_payment',     'Pago tarjeta crédito', '#a8a29e', 'non_computable', 46)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. Baja de 'insurance' (orden seguro)
-- ============================================================
-- Hoy 'insurance' no tiene transacciones, pero se reasigna por robustez antes
-- de borrar (categorization_rules.category_id tiene FK a categories.id;
-- transactions.category NO tiene FK, así que borrar sin reasignar dejaría filas
-- huérfanas excluidas de Análisis por el INNER JOIN de la matview).
UPDATE transactions      SET category        = 'insurance_home' WHERE category        = 'insurance';
UPDATE transactions      SET category_manual = 'insurance_home' WHERE category_manual = 'insurance';
DELETE FROM categorization_rules WHERE category_id = 'insurance';
DELETE FROM categories           WHERE id          = 'insurance';

-- ============================================================
-- 3. Refrescar la vista materializada de analítica
-- ============================================================
REFRESH MATERIALIZED VIEW transactions_monthly_summary;
