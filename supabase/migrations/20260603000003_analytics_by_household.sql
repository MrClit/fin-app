-- Issue #131 (Fase 1): agregaciones a nivel de hogar.
-- La vista materializada y get_period_data pasan de agrupar/filtrar por user_id
-- a hacerlo por household_id. La clasificación por categories.type (#63) no cambia.
--
-- Ejecutar en Supabase SQL Editor como un único bloque.

-- ============================================================
-- 1. Recrear la vista materializada agrupando por household_id
-- ============================================================
DROP MATERIALIZED VIEW IF EXISTS transactions_monthly_summary;

CREATE MATERIALIZED VIEW transactions_monthly_summary AS
SELECT
  t.household_id,
  t.account_id,
  DATE_TRUNC('month', t.date)::date                                  AS month,
  COALESCE(t.category_manual, t.category)                            AS effective_category,
  SUM(CASE WHEN c.type = 'income'  THEN t.amount ELSE 0 END)         AS ingresos,
  SUM(CASE WHEN c.type = 'expense' THEN t.amount ELSE 0 END)         AS gastos,
  COUNT(*)                                                            AS tx_count
FROM   transactions t
JOIN   categories  c ON c.id = COALESCE(t.category_manual, t.category)
WHERE  c.type IN ('income', 'expense')
GROUP  BY t.household_id, t.account_id, DATE_TRUNC('month', t.date), COALESCE(t.category_manual, t.category);

-- Índice único requerido para REFRESH MATERIALIZED VIEW CONCURRENTLY.
CREATE UNIQUE INDEX idx_monthly_unique
  ON transactions_monthly_summary(household_id, account_id, month, effective_category)
  NULLS NOT DISTINCT;

CREATE INDEX idx_monthly_household_month
  ON transactions_monthly_summary(household_id, month DESC);

-- refresh_monthly_summary() no cambia: sigue refrescando CONCURRENTLY.

-- ============================================================
-- 2. Recrear get_period_data filtrando por household_id
-- ============================================================
DROP FUNCTION IF EXISTS get_period_data(UUID, DATE, DATE);

CREATE OR REPLACE FUNCTION get_period_data(
  p_household_id UUID,
  p_start_date   DATE,
  p_end_date     DATE
) RETURNS TABLE (
  ingresos    DECIMAL,
  gastos      DECIMAL,
  ahorro      DECIMAL,
  by_category JSONB
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  WITH txs AS (
    SELECT t.amount,
           COALESCE(t.category_manual, t.category) AS cat,
           c.type                                  AS cat_type
    FROM   transactions t
    LEFT   JOIN categories c
           ON c.id = COALESCE(t.category_manual, t.category)
    WHERE  t.household_id = p_household_id
      AND  t.date BETWEEN p_start_date AND p_end_date
  ),
  totals AS (
    SELECT
      COALESCE(SUM(amount) FILTER (WHERE cat_type = 'income'),       0) AS inc,
      COALESCE(ABS(SUM(amount) FILTER (WHERE cat_type = 'expense')), 0) AS exp
    FROM txs
  ),
  cats AS (
    SELECT cat, SUM(amount) AS total
    FROM   txs
    WHERE  cat_type IN ('income', 'expense')
    GROUP  BY cat
  )
  SELECT
    totals.inc,
    totals.exp,
    totals.inc - totals.exp AS sav,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('category', cat, 'amount', total)) FROM cats),
      '[]'::jsonb
    )
  FROM totals;
END;
$$;
