-- Issue #200: Observabilidad de errores. Tabla `error_log` para registrar fallos
-- cliente/servidor con contexto suficiente para accionarlos por SQL Editor.
--
-- La ingesta se hace con el service role (ver lib/error-log.ts), que se salta RLS,
-- de modo que un error se registra siempre, incluso sin sesión ni hogar resoluble.
-- La RLS se activa igualmente por convención, con una policy de SOLO LECTURA por hogar.
--
-- Ejecutar en Supabase SQL Editor como un único bloque.

CREATE TABLE error_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  source       TEXT NOT NULL CHECK (source IN ('client', 'server')),
  message      TEXT NOT NULL,
  stack        TEXT,
  route        TEXT,
  context      JSONB,
  -- user_id nullable + ON DELETE SET NULL: un error puede ocurrir sin sesión y no
  -- queremos perder el registro si más adelante se borra el usuario.
  user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- household_id nullable: puede no haber hogar resoluble en el momento del fallo.
  household_id UUID REFERENCES households(id) ON DELETE CASCADE
);

CREATE INDEX idx_error_log_created_at ON error_log(created_at DESC);

ALTER TABLE error_log ENABLE ROW LEVEL SECURITY;

-- Lectura por hogar (consistencia con el resto de tablas). La ingesta usa service
-- role, que se salta RLS, así que no se necesita policy de INSERT para el cliente anon.
CREATE POLICY "Household members read error log" ON error_log
  FOR SELECT USING (household_id IN (SELECT current_household_ids()));
