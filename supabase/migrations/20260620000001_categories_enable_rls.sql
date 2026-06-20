-- Issue #232 (seguridad): la tabla categories se creó sin RLS (datos de referencia
-- compartidos). Al estar en public queda expuesta por la Data API y el Security Advisor
-- la marca como rls_disabled_in_public. Es destino de FK de transactions.category /
-- category_manual: sin RLS, un authenticated con grant de escritura podría alterar el
-- catálogo compartido de todos los hogares.
--
-- El cliente nunca escribe en categories: el catálogo se siembra server-side
-- (pnpm seed:categories -> supabase/seed/categories.sql) con un rol que bypassa RLS.
-- Habilitamos RLS con policy de solo lectura para authenticated; la siembra no se ve
-- afectada. Revocamos además escrituras a anon/authenticated como defensa en profundidad.
--
-- Ejecutar en Supabase SQL Editor como un único bloque.

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can read categories" ON categories;
CREATE POLICY "Anyone authenticated can read categories" ON categories
  FOR SELECT TO authenticated USING (true);

-- Defensa en profundidad: ningún rol de la Data API debe escribir el catálogo.
REVOKE INSERT, UPDATE, DELETE ON categories FROM anon, authenticated;
