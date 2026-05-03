-- Issue #2: Schema inicial de Supabase
-- Tablas, índices, RLS policies y vista materializada según §3.1 y §5.4 del spec.
--
-- Ejecutar en Supabase SQL Editor como un único bloque.
-- gen_random_uuid() es built-in desde PostgreSQL 13 — no requiere extensión.

-- ============================================================
-- TABLA: accounts
-- ============================================================
CREATE TABLE accounts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  type                TEXT NOT NULL CHECK (type IN ('bank', 'card', 'edenred', 'cash')),
  source              TEXT NOT NULL CHECK (source IN ('enablebanking', 'scraper', 'manual')),
  is_liability        BOOLEAN DEFAULT false,   -- true = tarjeta de crédito / préstamo (resta del patrimonio)
  balance             DECIMAL(12,2),
  number              TEXT,                    -- "•••• 4521" enmascarado
  color               TEXT,                    -- hex color para la UI
  currency            TEXT DEFAULT 'EUR',
  external_id         TEXT,                    -- ID de cuenta en Enable Banking
  session_id          TEXT,                    -- ID de la sesión Enable Banking (para renovación)
  consent_expires_at  TIMESTAMP WITH TIME ZONE, -- caducidad PSD2 (90-180 días)
  last_synced         TIMESTAMP WITH TIME ZONE,
  is_active           BOOLEAN DEFAULT true,
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_accounts_user_id ON accounts(user_id);

-- ============================================================
-- TABLA: transactions
-- ============================================================
CREATE TABLE transactions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id           UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  date                 DATE NOT NULL,
  amount               DECIMAL(12,2) NOT NULL,  -- negativo = gasto, positivo = ingreso
  description          TEXT NOT NULL,
  category             TEXT,                    -- categoría asignada automáticamente
  category_manual      TEXT,                    -- categoría editada por el usuario (override)
  source               TEXT NOT NULL CHECK (source IN ('enablebanking', 'scraper', 'manual')),
  external_id          TEXT,                    -- ID de transacción en Enable Banking
  is_computable        BOOLEAN DEFAULT true,    -- false = No Computable (Edenred)
  is_internal_transfer BOOLEAN DEFAULT false,  -- traspaso entre cuentas propias
  notes                TEXT,
  created_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- external_id es nullable: PostgreSQL trata los NULLs como distintos en UNIQUE,
  -- por lo que varias transacciones manuales (external_id IS NULL) están permitidas.
  -- Solo las transacciones de banco tienen external_id y necesitan deduplicación.
  UNIQUE(user_id, external_id)
);

CREATE INDEX idx_transactions_user_date ON transactions(user_id, date DESC);
CREATE INDEX idx_transactions_account   ON transactions(account_id);

-- ============================================================
-- TABLA: user_config
-- ============================================================
CREATE TABLE user_config (
  user_id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  has_onboarded    BOOLEAN DEFAULT false,
  primary_currency TEXT DEFAULT 'EUR',
  month_start_day  INTEGER DEFAULT 1,  -- día del mes en que empieza el período
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger para actualizar updated_at automáticamente en cada UPDATE
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_config_updated_at
  BEFORE UPDATE ON user_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE accounts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_config  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own accounts"
  ON accounts     FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users access own transactions"
  ON transactions FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users access own config"
  ON user_config  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- VISTA MATERIALIZADA: transactions_monthly_summary
-- ============================================================
CREATE MATERIALIZED VIEW transactions_monthly_summary AS
SELECT
  user_id,
  account_id,
  DATE_TRUNC('month', date)::date                     AS month,
  COALESCE(category_manual, category)                 AS effective_category,
  SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END)    AS ingresos,
  SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END)    AS gastos,
  COUNT(*)                                            AS tx_count
FROM transactions
WHERE is_computable = true
  AND is_internal_transfer = false
-- GROUP BY usa la expresión completa, no el alias (PostgreSQL no permite aliases en GROUP BY)
GROUP BY user_id, account_id, DATE_TRUNC('month', date), COALESCE(category_manual, category);

-- Índice único requerido para REFRESH MATERIALIZED VIEW CONCURRENTLY.
-- NULLS NOT DISTINCT (PG15+) trata los NULLs como iguales a efectos de unicidad,
-- necesario porque effective_category puede ser NULL.
CREATE UNIQUE INDEX idx_monthly_unique
  ON transactions_monthly_summary(user_id, account_id, month, effective_category)
  NULLS NOT DISTINCT;

-- Índice de rendimiento para consultas de analytics por usuario y mes
CREATE INDEX idx_monthly_user_month
  ON transactions_monthly_summary(user_id, month DESC);
