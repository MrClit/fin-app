-- Issue #131 (Fase 1): modelo de hogar / datos financieros compartidos.
-- Crea las tablas del hogar y el helper de pertenencia usado por la RLS.
--
-- Ejecutar en Supabase SQL Editor como un único bloque.

-- ============================================================
-- TABLA: households
-- ============================================================
-- Un hogar agrupa a varios usuarios que comparten el mismo conjunto de datos
-- financieros. La config que afecta a las agregaciones (moneda, día de inicio
-- de período) vive aquí para que sea consistente entre miembros.
CREATE TABLE IF NOT EXISTS households (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL DEFAULT 'Mi hogar',
  primary_currency TEXT DEFAULT 'EUR',
  month_start_day  INTEGER DEFAULT 1,   -- día del mes en que empieza el período
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- TABLA: household_members
-- ============================================================
-- Membresía de cada usuario en un hogar. `role` se reserva para extensibilidad;
-- en Fase 1 todos los miembros tienen acceso idéntico de lectura/escritura.
CREATE TABLE IF NOT EXISTS household_members (
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role         TEXT NOT NULL DEFAULT 'member',
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (household_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_household_members_user ON household_members(user_id);

-- ============================================================
-- HELPER: current_household_ids()
-- ============================================================
-- Devuelve los hogares a los que pertenece el usuario autenticado.
-- SECURITY DEFINER para que la RLS de las tablas de datos pueda comprobar
-- pertenencia sin que la consulta a household_members dispare su propia RLS
-- (evita recursión). Se fija search_path por seguridad.
CREATE OR REPLACE FUNCTION current_household_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT household_id FROM household_members WHERE user_id = auth.uid();
$$;

-- ============================================================
-- ROW LEVEL SECURITY de las tablas del hogar
-- ============================================================
ALTER TABLE households        ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;

-- Un usuario sólo ve los hogares a los que pertenece...
DROP POLICY IF EXISTS "Members access their households" ON households;
CREATE POLICY "Members access their households" ON households
  FOR ALL USING (id IN (SELECT current_household_ids()))
  WITH CHECK (id IN (SELECT current_household_ids()));

-- ...y sólo las filas de membresía de sus propios hogares.
DROP POLICY IF EXISTS "Members access household membership" ON household_members;
CREATE POLICY "Members access household membership" ON household_members
  FOR ALL USING (household_id IN (SELECT current_household_ids()))
  WITH CHECK (household_id IN (SELECT current_household_ids()));
