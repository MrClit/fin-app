-- Issue #178 (seguridad): get_period_data (SECURITY DEFINER) no validaba pertenencia al hogar.
--
-- La función salta la RLS (SECURITY DEFINER) y filtra por el p_household_id recibido sin
-- comprobar que auth.uid() pertenezca a ese hogar. Como las funciones de `public` son
-- ejecutables por el rol `authenticated` por defecto, un usuario con sesión válida podía
-- llamar al RPC directamente por PostgREST con el UUID de otro hogar y leer sus datos (IDOR).
--
-- Mitigación: validar la pertenencia dentro de la función reutilizando el helper seguro
-- current_household_ids() (ver 20260603000000_households.sql), mismo punto de verdad que la RLS.
-- No se puede usar REVOKE: las rutas /api/analytics invocan el RPC con el rol `authenticated`
-- (anon key + JWT del usuario), no con service role.
--
-- Solo se añade la guarda y SET search_path = public; la lógica de agregación es idéntica
-- a la versión vigente (20260605000000_rename_analytics_columns_to_english.sql).
--
-- Ejecutar en Supabase SQL Editor como un único bloque.

CREATE OR REPLACE FUNCTION get_period_data(
  p_household_id UUID,
  p_start_date   DATE,
  p_end_date     DATE
) RETURNS TABLE (
  income      DECIMAL,
  expense     DECIMAL,
  savings     DECIMAL,
  by_category JSONB
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Guarda anti-IDOR: el usuario autenticado debe pertenecer al hogar solicitado.
  -- Con service role auth.uid() es NULL -> conjunto vacío -> también se rechaza.
  IF p_household_id NOT IN (SELECT current_household_ids()) THEN
    RAISE EXCEPTION 'forbidden: household not accessible by current user'
      USING ERRCODE = '42501';   -- insufficient_privilege
  END IF;

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
