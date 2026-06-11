-- Issue #40: Función get_period_data para la API de análisis (§5.4)
-- Agrega transacciones computables en un rango de fechas arbitrario,
-- soportando las 4 granularidades (semana, mes, trimestre, año).

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
    SELECT amount, COALESCE(category_manual, category) AS cat
    FROM   transactions
    WHERE  user_id              = p_user_id
      AND  date BETWEEN p_start_date AND p_end_date
      AND  is_computable        = true
      AND  is_internal_transfer = false
  ),
  totals AS (
    SELECT
      COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0)       AS inc,
      COALESCE(ABS(SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END)), 0)  AS exp
    FROM txs
  ),
  cats AS (
    SELECT cat, SUM(amount) AS total
    FROM   txs
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
