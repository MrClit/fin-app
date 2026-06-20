-- Issue #231 (seguridad + cómputo muerto): la MV transactions_monthly_summary no
-- aplica RLS y vive en public (expuesta por PostgREST → fuga entre hogares). Además
-- nadie la lee: la analítica usa get_period_data en vivo (app/api/analytics) y el
-- Dashboard consulta transactions/accounts directamente. Solo se refrescaba en cada
-- sync, pagando un REFRESH MATERIALIZED VIEW CONCURRENTLY completo sin lectores.
--
-- Se elimina la MV junto con su función de refresh. Los índices de la MV
-- (idx_monthly_unique / idx_monthly_user_month y variantes household) caen
-- automáticamente con el DROP MATERIALIZED VIEW.
--
-- Ejecutar en Supabase SQL Editor como un único bloque.

DROP MATERIALIZED VIEW IF EXISTS transactions_monthly_summary;
DROP FUNCTION IF EXISTS refresh_monthly_summary();
