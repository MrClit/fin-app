-- Issue #239: tras #131 la visibilidad y las queries pasaron de user_id a household_id.
-- Estos índices del modelo anterior no los usa ninguna query: en transactions (tabla más
-- escrita por el sync) son amplificación de escritura y almacenamiento muertos. Se retiran
-- solo los índices; la columna user_id se conserva como creador/auditoría (ver #131).
--
-- Cubiertos hoy por idx_transactions_household_date / idx_accounts_household /
-- idx_categorization_rules_household. NO se tocan idx_household_members_user ni
-- idx_push_subscriptions_user_id (siguen sirviendo filtros vivos por user_id).
--
-- Precondición: confirmar idx_scan = 0 en pg_stat_user_indexes y revisar el Performance
-- Advisor antes de ejecutar.
--
-- Ejecutar en Supabase SQL Editor como un único bloque.

DROP INDEX IF EXISTS idx_transactions_user_date;
DROP INDEX IF EXISTS idx_accounts_user_id;
DROP INDEX IF EXISTS idx_categorization_rules_user;
