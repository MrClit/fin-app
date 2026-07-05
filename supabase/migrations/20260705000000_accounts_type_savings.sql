-- Issue #197: nuevo tipo de cuenta 'savings' (cuenta de ahorro Sabadell).
--
-- La cuenta de ahorro es un activo (is_liability=false) cuyo saldo debe sumar al
-- patrimonio neto. Se distingue de 'bank' para poder darle icono/label propios y
-- agrupar en la UI. La fila la creará el endpoint /api/sabadell-savings en el
-- primer sync (con sort_order=15, tras la cuenta corriente); aquí solo se amplía
-- el CHECK de accounts.type.
--
-- El CHECK original es inline en 20260503000000_initial_schema.sql, por lo que
-- Postgres le asignó el nombre por defecto `accounts_type_check`. Verificar antes
-- de ejecutar con:
--   SELECT conname FROM pg_constraint
--   WHERE conrelid = 'accounts'::regclass AND contype = 'c';
--
-- Ejecutar en Supabase SQL Editor como un único bloque.

ALTER TABLE accounts DROP CONSTRAINT accounts_type_check;
ALTER TABLE accounts ADD CONSTRAINT accounts_type_check
  CHECK (type IN ('bank', 'card', 'edenred', 'cash', 'savings'));
