-- Issue #180 (seguridad, hardening): refresh_monthly_summary() (SECURITY DEFINER) no fijaba
-- search_path, lo que la exponía a search_path injection (ver current_household_ids en
-- 20260603000000_households.sql, que sí lo fija). Es la única DEFINER de public que faltaba:
-- get_period_data ya lo añadió en #178 (20260613000000).
--
-- Solo se añade SET search_path = public; el cuerpo es idéntico a 20260507000000_sync_helpers.sql.
-- CREATE OR REPLACE preserva los permisos, así que el REVOKE de #179 (20260613000001) sigue
-- vigente; se re-incluye como defensa explícita.
--
-- Ejecutar en Supabase SQL Editor como un único bloque.

CREATE OR REPLACE FUNCTION refresh_monthly_summary()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY transactions_monthly_summary;
END;
$$;

REVOKE EXECUTE ON FUNCTION refresh_monthly_summary() FROM anon, authenticated;
