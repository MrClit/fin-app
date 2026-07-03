-- Issue #234 (seguridad): endurecer la RLS de household_members con control de rol.
--
-- La policy original era FOR ALL con USING/WITH CHECK (household_id IN
-- current_household_ids()), sin distinguir `role`. Cualquier miembro del hogar
-- podía insertar membresías arbitrarias (añadir terceros), expulsar a otros
-- miembros (incluido el owner) o auto-promoverse. Inofensivo en Fase 1 (un único
-- usuario, que ya es owner por el backfill de 20260603000001), pero es una vía de
-- escalada que debe cerrarse antes de habilitar multiusuario (#131/#132).
--
-- Separamos las policies por operación: lectura para cualquier miembro del hogar
-- (comportamiento actual); escritura (INSERT/UPDATE/DELETE) restringida al owner.
-- El modelo de invitaciones / asignación de owner a nuevos hogares es parte de
-- #131/#132.
--
-- Ejecutar en Supabase SQL Editor como un único bloque.

-- ============================================================
-- HELPER: current_owner_household_ids()
-- ============================================================
-- Hogares en los que el usuario autenticado es owner. Análogo a
-- current_household_ids(): SECURITY DEFINER para que las policies de escritura de
-- household_members puedan comprobar el rol sin disparar la RLS de la propia tabla
-- (evita recursión). search_path fijado por seguridad.
CREATE OR REPLACE FUNCTION current_owner_household_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT household_id FROM household_members
  WHERE user_id = auth.uid() AND role = 'owner';
$$;

-- ============================================================
-- POLICIES de household_members por operación
-- ============================================================
DROP POLICY IF EXISTS "Members access household membership" ON household_members;

-- Lectura: cualquier miembro ve las membresías de sus hogares (comportamiento actual).
CREATE POLICY "Members read household membership" ON household_members
  FOR SELECT USING (household_id IN (SELECT current_household_ids()));

-- Escritura: solo el owner del hogar gestiona las membresías.
CREATE POLICY "Owners insert household membership" ON household_members
  FOR INSERT WITH CHECK (household_id IN (SELECT current_owner_household_ids()));

CREATE POLICY "Owners update household membership" ON household_members
  FOR UPDATE USING     (household_id IN (SELECT current_owner_household_ids()))
             WITH CHECK (household_id IN (SELECT current_owner_household_ids()));

CREATE POLICY "Owners delete household membership" ON household_members
  FOR DELETE USING (household_id IN (SELECT current_owner_household_ids()));
