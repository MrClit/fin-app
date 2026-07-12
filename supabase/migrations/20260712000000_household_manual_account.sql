-- Issue #307: la cuenta «Manual» pasa a ser parte del bootstrap del hogar.
--
-- Hasta ahora la creaba `ensureManualAccountId()` durante el render del Server
-- Component de /transactions: una escritura en un camino de lectura, que Next puede
-- ejecutar en un prefetch o repetir en un re-render, y que con dos requests
-- concurrentes chocaba contra el índice único (error en el render).
--
-- La responsabilidad se mueve a la BD: un trigger la crea cuando el hogar recibe a su
-- owner, y un backfill cubre los hogares existentes. El render queda de solo lectura.
--
-- Ejecutar en Supabase SQL Editor como un único bloque.

-- ============================================================
-- 1. Restricción única (ya existente desde 20260603000001)
-- ============================================================
-- Se re-afirma aquí para que el invariante «como máximo una cuenta manual por hogar»
-- viva junto a las reglas que lo garantizan. No-op en las bases ya migradas.
CREATE UNIQUE INDEX IF NOT EXISTS accounts_household_manual_unique
  ON accounts (household_id)
  WHERE source = 'manual';

-- ============================================================
-- 2. Trigger: cuenta «Manual» al dar de alta el owner del hogar
-- ============================================================
-- El trigger cuelga de household_members y no de households porque `accounts.user_id`
-- es NOT NULL: en el momento del INSERT del hogar todavía no existe ningún usuario al
-- que atribuir la cuenta. La membresía del owner es el primer punto donde coexisten
-- household_id y user_id.
--
-- SECURITY DEFINER + search_path fijo, como current_household_ids(): el bootstrap no
-- debe depender de que la RLS de accounts ya vea la membresía recién insertada.
CREATE OR REPLACE FUNCTION create_household_manual_account()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO accounts (household_id, user_id, name, type, source, color)
  VALUES (NEW.household_id, NEW.user_id, 'Manual', 'cash', 'manual', '#64748b')
  ON CONFLICT (household_id) WHERE source = 'manual' DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_household_manual_account ON household_members;
CREATE TRIGGER trg_household_manual_account
  AFTER INSERT ON household_members
  FOR EACH ROW
  WHEN (NEW.role = 'owner')
  EXECUTE FUNCTION create_household_manual_account();

-- ============================================================
-- 3. Backfill de los hogares existentes
-- ============================================================
-- `user_id` = el owner más antiguo del hogar; si no hubiera owner, el miembro más
-- antiguo. Los hogares sin miembros se saltan (no hay user_id posible y no los ve nadie).
INSERT INTO accounts (household_id, user_id, name, type, source, color)
SELECT h.id, m.user_id, 'Manual', 'cash', 'manual', '#64748b'
FROM households h
CROSS JOIN LATERAL (
  SELECT hm.user_id
  FROM household_members hm
  WHERE hm.household_id = h.id
  ORDER BY (hm.role = 'owner') DESC, hm.created_at ASC
  LIMIT 1
) m
WHERE NOT EXISTS (
  SELECT 1 FROM accounts a
  WHERE a.household_id = h.id AND a.source = 'manual'
);
