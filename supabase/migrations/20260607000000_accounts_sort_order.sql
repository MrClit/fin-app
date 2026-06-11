-- Issue #159: orden explícito de cuentas.
--
-- Hasta ahora las cuentas se mostraban por `created_at` (orden de alta), que no
-- coincide con el orden deseado por el usuario. Añadimos `sort_order` como criterio
-- principal (con `created_at` como desempate en las queries) para fijar:
--   Cuenta Sabadell → Sabadell VISA Víctor → Sabadell VISA Mesalina → Edenred → Manual
--
-- El renombrado de las VISAs NO se hace aquí: lo aplica el endpoint
-- /api/sabadell-visa en cada sync (resolveCardName). Por eso las VISAs se
-- identifican por su `external_id` (el PAN enmascarado termina en los 4 dígitos de
-- la tarjeta y no cambia nunca), en vez de por el nombre, que sí cambia al renombrar.
--
-- Ejecutar en Supabase SQL Editor como un único bloque.

-- ============================================================
-- 1. Nueva columna (DEFAULT alto → cuentas nuevas van al final)
-- ============================================================
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 1000;

-- ============================================================
-- 2. Orden inicial de las cuentas existentes
-- ============================================================
UPDATE accounts SET sort_order = 10 WHERE type = 'bank';
UPDATE accounts SET sort_order = 20 WHERE type = 'card' AND source = 'scraper' AND external_id LIKE '%5011';
UPDATE accounts SET sort_order = 30 WHERE type = 'card' AND source = 'scraper' AND external_id LIKE '%4014';
UPDATE accounts SET sort_order = 40 WHERE type = 'edenred';
UPDATE accounts SET sort_order = 50 WHERE type = 'cash' AND source = 'manual';
