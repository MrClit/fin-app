-- Refactor (#63): la fuente única de verdad para clasificar una transacción
-- en Análisis es ahora `categories.type` ('expense' | 'income' | 'non_computable').
-- Se eliminan `is_computable` e `is_internal_transfer` de `transactions`, y las
-- agregaciones SQL pasan a clasificar por `c.type` en lugar de por el signo
-- del `amount`.

-- 1. DROP de dependencias (referencian las columnas a eliminar)
DROP MATERIALIZED VIEW IF EXISTS transactions_monthly_summary;
DROP FUNCTION IF EXISTS mark_internal_transfers(UUID);
DROP FUNCTION IF EXISTS get_period_data(UUID, DATE, DATE);

-- 2. Eliminar las columnas
ALTER TABLE transactions DROP COLUMN IF EXISTS is_computable;
ALTER TABLE transactions DROP COLUMN IF EXISTS is_internal_transfer;

-- 3. Recrear vista materializada: agrega por `categories.type`.
--    INNER JOIN excluye automáticamente transacciones sin categoría.
--    Filtra `non_computable` a nivel de vista para mantener la semántica de
--    "totales de Análisis" (ingresos/gastos comparables).
CREATE MATERIALIZED VIEW transactions_monthly_summary AS
SELECT
  t.user_id,
  t.account_id,
  DATE_TRUNC('month', t.date)::date                                  AS month,
  COALESCE(t.category_manual, t.category)                            AS effective_category,
  SUM(CASE WHEN c.type = 'income'  THEN t.amount ELSE 0 END)         AS ingresos,
  SUM(CASE WHEN c.type = 'expense' THEN t.amount ELSE 0 END)         AS gastos,
  COUNT(*)                                                            AS tx_count
FROM   transactions t
JOIN   categories  c ON c.id = COALESCE(t.category_manual, t.category)
WHERE  c.type IN ('income', 'expense')
GROUP  BY t.user_id, t.account_id, DATE_TRUNC('month', t.date), COALESCE(t.category_manual, t.category);

-- Índice único requerido para REFRESH MATERIALIZED VIEW CONCURRENTLY.
-- effective_category aquí nunca es NULL (INNER JOIN), pero mantenemos
-- NULLS NOT DISTINCT por consistencia con la versión anterior.
CREATE UNIQUE INDEX idx_monthly_unique
  ON transactions_monthly_summary(user_id, account_id, month, effective_category)
  NULLS NOT DISTINCT;

CREATE INDEX idx_monthly_user_month
  ON transactions_monthly_summary(user_id, month DESC);

-- 4. Recrear get_period_data: KPIs y breakdown clasifican por `c.type`.
--    LEFT JOIN para poder distinguir "sin categoría" (cat_type IS NULL); estas
--    transacciones se excluyen de ingresos/gastos hasta que el usuario las
--    categorice.
CREATE OR REPLACE FUNCTION get_period_data(
  p_user_id    UUID,
  p_start_date DATE,
  p_end_date   DATE
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
    WHERE  t.user_id = p_user_id
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
