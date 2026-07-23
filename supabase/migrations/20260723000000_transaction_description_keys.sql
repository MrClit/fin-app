-- Issue #359 (fase 1): categorización aprendida de las correcciones del usuario.
--
-- Hasta ahora la categorización automática era 100% estática (~45 regex en
-- lib/categories/rules.ts, iguales para todos los hogares) y no aprendía: cada vez
-- que el usuario recategorizaba se escribía `category_manual` y ahí moría la señal.
--
-- No se introduce ninguna tabla de reglas aprendidas: la tabla de reglas aprendidas
-- SON los propios movimientos ya corregidos a mano. Lo que falta para poder
-- consultarlos es una clave de comercio estable por fila, y una función que agregue
-- el voto. Eso es todo lo que añade esta migración:
--
--   1. `description_key` / `description_key_root` en transactions, con sus índices.
--   2. `get_learned_categories(household)`, que devuelve la categoría ganadora por
--      clave con su nº de ejemplos y su confianza.
--
-- Ejecutar en Supabase SQL Editor como un único bloque.
-- DESPUÉS: `pnpm gen:types` y commitear lib/supabase/database.types.ts.
-- DESPUÉS: `pnpm backfill:tx-keys` (las filas existentes nacen con la clave a NULL, y
-- el sync de Enable Banking usa ignoreDuplicates: true, así que un re-sync NUNCA las
-- rellenaría).

-- ============================================================
-- 1. Claves de comercio
-- ============================================================
-- Las calcula `lib/categories/normalize.ts` y se escriben desde el núcleo de
-- ingesta (`toTransactionRow`) y el alta manual. NO se derivan en SQL a propósito:
-- una segunda implementación de la tubería de normalización acabaría divergiendo de
-- la de TypeScript, y las claves de antes y después del corte dejarían de agrupar.
--
-- NULL significa «descriptor sin señal» (`TRANSFERENCIA`, `BIZUM`, `Sin
-- descripción`…): esas filas no aprenden ni se agrupan, que es justo lo que se
-- quiere. Por eso los índices son parciales.
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS description_key      TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS description_key_root TEXT;

COMMENT ON COLUMN transactions.description_key IS
  'Clave de comercio canonicalizada desde description (lib/categories/normalize.ts). NULL = descriptor sin señal.';
COMMENT ON COLUMN transactions.description_key_root IS
  'Primer token de description_key: agrupa el mismo comercio en distintas ciudades. NULL si no aporta un segundo nivel.';

-- Sirven a los tres usos: la agregación del voto, el conteo/aplicación retroactiva
-- y el propio backfill.
CREATE INDEX IF NOT EXISTS idx_transactions_household_key
  ON transactions (household_id, description_key)
  WHERE description_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_household_key_root
  ON transactions (household_id, description_key_root)
  WHERE description_key_root IS NOT NULL;

-- ============================================================
-- 2. get_learned_categories
-- ============================================================
-- Voto por mayoría ponderado por recencia sobre el histórico etiquetado del hogar.
--
-- SECURITY INVOKER (y NO definer, a diferencia de get_period_data): así la RLS de
-- transactions hace el aislamiento por hogar para el usuario autenticado, y el
-- service role de la ingesta —que no tiene sesión y para el que auth.uid() es
-- NULL— la salta legítimamente. Una versión DEFINER con guarda contra
-- current_household_ids() rechazaría precisamente a la ingesta, que es el llamante
-- principal.
--
-- INVARIANTE 1: sólo se aprende de `category_manual`. Si la función contase también
-- las categorías que la app se asigna a sí misma, sus errores se volverían «verdad»
-- y se amplificarían con confianza creciente en cada sync.
--
-- Recencia: peso = 0.5 ^ (antigüedad_en_días / 90). La semivida de 90 días es lo que
-- hace que un cambio de criterio dé la vuelta a la regla en 2-3 correcciones sin
-- tener que borrar nada: 12 ejemplos de hace un año pesan ~0,71 en total y dos
-- correcciones de hoy pesan 2,0. Se pondera por `date` (no por la fecha de la
-- corrección) porque transactions no tiene `updated_at`; en la práctica el usuario
-- corrige movimientos recientes, así que es un buen sustituto.
--
-- El umbral de confianza NO se aplica aquí sino en TypeScript
-- (lib/categories/learned.ts): así se puede testear sin base de datos y vive junto a
-- la stoplist, que es de la misma naturaleza.
CREATE OR REPLACE FUNCTION get_learned_categories(p_household_id UUID)
RETURNS TABLE (
  key         TEXT,
  level       TEXT,
  category_id TEXT,
  n           INTEGER,
  confidence  NUMERIC
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH labelled AS (
    SELECT
      t.description_key                                            AS k_exact,
      t.description_key_root                                       AS k_root,
      t.category_manual                                            AS cat,
      power(0.5, GREATEST(CURRENT_DATE - t.date, 0) / 90.0)        AS w
    FROM transactions t
    WHERE t.household_id    = p_household_id
      AND t.category_manual IS NOT NULL
      AND t.description_key IS NOT NULL
  ),
  -- Los dos niveles compiten por separado: una clave exacta con pocos ejemplos y
  -- una raíz con muchos son reglas distintas, y el consumidor prueba la exacta
  -- primero.
  keyed AS (
    SELECT l.k_exact AS k, 'exact'::TEXT AS lvl, l.cat, l.w FROM labelled l
    UNION ALL
    SELECT l.k_root, 'root'::TEXT, l.cat, l.w FROM labelled l WHERE l.k_root IS NOT NULL
  ),
  votes AS (
    SELECT k2.k, k2.lvl, k2.cat, SUM(k2.w) AS weight, COUNT(*)::INTEGER AS n_votes
    FROM keyed k2
    GROUP BY k2.k, k2.lvl, k2.cat
  ),
  ranked AS (
    SELECT
      v.k, v.lvl, v.cat, v.weight, v.n_votes,
      SUM(v.weight) OVER (PARTITION BY v.k, v.lvl)                          AS total,
      -- Desempate determinista por id de categoría: dos ejecuciones sobre los
      -- mismos datos devuelven siempre lo mismo.
      ROW_NUMBER() OVER (PARTITION BY v.k, v.lvl ORDER BY v.weight DESC, v.n_votes DESC, v.cat) AS rn
    FROM votes v
  )
  SELECT
    r.k,
    r.lvl,
    r.cat,
    r.n_votes,
    ROUND((r.weight / NULLIF(r.total, 0))::NUMERIC, 4)
  FROM ranked r
  WHERE r.rn = 1;
$$;

COMMENT ON FUNCTION get_learned_categories(UUID) IS
  'Issue #359: categoría ganadora por clave de comercio, votada sobre las correcciones manuales del hogar y ponderada por recencia (semivida 90 días).';
