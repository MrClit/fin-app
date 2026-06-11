-- Renombrar el `id` de la categoría 'income' (name "Nómina") → 'payroll'.
-- Ref: issue #151.
--
-- Motivo: el string 'income' se usaba con dos significados (el `type` que agrupa
-- todos los ingresos, y el `id` de la categoría concreta "Nómina"), lo que
-- resultaba ambiguo. Se renombra SOLO el `id`; el `type 'income'` permanece igual.
--
-- FK: categorization_rules.category_id referencia categories.id (sin ON UPDATE
-- CASCADE); transactions.category / category_manual NO tienen FK. Por eso el
-- orden es alta → repunte de referencias → baja, como en
-- 20260609000000_categories_revision.sql.
--
-- Mantener en sincronía con el seed (20260509000000_categories_type.sql), que ya
-- siembra 'payroll' para instalaciones nuevas.
--
-- Ejecutar en Supabase SQL Editor como un único bloque.

-- ============================================================
-- 1. Alta de la nueva fila 'payroll' (clon de 'income'/Nómina)
-- ============================================================
INSERT INTO categories (id, name, color, type, sort_order)
VALUES ('payroll', 'Nómina', '#3b82f6', 'income', 34)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. Repuntar referencias al nuevo id
-- ============================================================
UPDATE transactions         SET category        = 'payroll' WHERE category        = 'income';
UPDATE transactions         SET category_manual = 'payroll' WHERE category_manual = 'income';
UPDATE categorization_rules SET category_id     = 'payroll' WHERE category_id     = 'income';

-- ============================================================
-- 3. Baja de la vieja fila (ya sin referencias)
-- ============================================================
DELETE FROM categories WHERE id = 'income';

-- ============================================================
-- 4. Refrescar la vista materializada de analítica
-- ============================================================
REFRESH MATERIALIZED VIEW transactions_monthly_summary;
