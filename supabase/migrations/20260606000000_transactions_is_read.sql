-- Issue #149: estado leído / no leído por movimiento.
--
-- Un movimiento que entra por sincronización (Enable Banking / scraper Edenred)
-- nace `is_read = false` para que el usuario sepa de un vistazo que hay novedades
-- (badge en la tabBar + sección "No leídos" en la lista). Los movimientos creados
-- manualmente por el usuario nacen leídos (lo fija el endpoint POST, no esta
-- migración).
--
-- Ejecutar en Supabase SQL Editor como un único bloque.

-- ============================================================
-- 1. Nueva columna (DEFAULT false → solo afecta a inserciones futuras)
-- ============================================================
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT false;

-- ============================================================
-- 2. Backfill: todo el histórico se marca como leído.
-- ============================================================
-- El DEFAULT false dejaría cientos de movimientos antiguos como "no leídos" e
-- inundaría el badge. Marcamos como leído todo lo existente en el momento de la
-- migración; el "no leído" queda reservado para lo que entre a partir de ahora.
UPDATE transactions SET is_read = true;

-- ============================================================
-- 3. Índice parcial para que el conteo de no leídos sea barato.
-- ============================================================
-- El badge cuenta `is_read = false` filtrando por hogar; un índice parcial sobre
-- (household_id) WHERE NOT is_read mantiene ese conteo y la sección "No leídos"
-- eficientes sin penalizar el resto de consultas.
CREATE INDEX IF NOT EXISTS idx_transactions_unread
  ON transactions(household_id)
  WHERE is_read = false;
