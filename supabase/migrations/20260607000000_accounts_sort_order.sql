-- Issue #159: orden explícito de cuentas.
--
-- Hasta ahora las cuentas se mostraban por `created_at` (orden de alta), que no
-- coincide con el orden deseado por el usuario. Añadimos `sort_order` como criterio
-- principal (con `created_at` como desempate en las queries) para fijar:
--   Cuenta Sabadell → Víctor (5011) → Mesalina (4014) → Edenred → Manual
--
-- El renombrado de las VISAs NO se hace aquí: lo aplica el endpoint
-- /api/sabadell-visa en cada sync (resolveCardName), así que las VISAs se
-- identifican por los últimos 4 dígitos presentes en el nombre, que matchean
-- tanto el nombre antiguo ("Sabadell VISA •••• 5011") como el nuevo ("Víctor (5011)").
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
UPDATE accounts SET sort_order = 20 WHERE type = 'card' AND source = 'scraper' AND name LIKE '%5011%';
UPDATE accounts SET sort_order = 30 WHERE type = 'card' AND source = 'scraper' AND name LIKE '%4014%';
UPDATE accounts SET sort_order = 40 WHERE type = 'edenred';
UPDATE accounts SET sort_order = 50 WHERE type = 'cash' AND source = 'manual';
