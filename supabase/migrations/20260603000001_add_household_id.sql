-- Issue #131 (Fase 1): añadir household_id a las tablas de datos, migrar los
-- datos existentes a un hogar inicial por usuario y reescribir las constraints
-- únicas de user_id -> household_id.
--
-- Se conserva user_id en todas las tablas como creador/auditoría; la propiedad
-- y la visibilidad pasan a determinarse por household_id.
--
-- Ejecutar en Supabase SQL Editor como un único bloque.

-- ============================================================
-- 1. Añadir columna household_id (nullable de momento, para poder backfillear)
-- ============================================================
ALTER TABLE accounts             ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id) ON DELETE CASCADE;
ALTER TABLE transactions         ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id) ON DELETE CASCADE;
ALTER TABLE user_config          ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id) ON DELETE CASCADE;
ALTER TABLE categorization_rules ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id) ON DELETE CASCADE;
ALTER TABLE push_subscriptions   ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id) ON DELETE CASCADE;

-- ============================================================
-- 2. Backfill: un hogar inicial por cada usuario existente.
-- ============================================================
-- IMPORTANTE: cada usuario distinto recibe su propio hogar (NO se fusionan
-- usuarios separados en un mismo hogar). En la práctica hoy hay un único
-- usuario => un único hogar "Mi hogar". El bloque es idempotente: si el usuario
-- ya tiene membresía, reutiliza su hogar y sólo rellena filas sin household_id.
DO $$
DECLARE
  u   RECORD;
  hid UUID;
BEGIN
  FOR u IN
    SELECT DISTINCT user_id FROM (
      SELECT user_id FROM accounts
      UNION SELECT user_id FROM transactions
      UNION SELECT user_id FROM user_config
      UNION SELECT user_id FROM categorization_rules
      UNION SELECT user_id FROM push_subscriptions
    ) s
    WHERE user_id IS NOT NULL
  LOOP
    SELECT hm.household_id INTO hid
    FROM household_members hm
    WHERE hm.user_id = u.user_id
    LIMIT 1;

    IF hid IS NULL THEN
      INSERT INTO households (name, primary_currency, month_start_day)
      SELECT 'Mi hogar',
             COALESCE(uc.primary_currency, 'EUR'),
             COALESCE(uc.month_start_day, 1)
      FROM (SELECT u.user_id AS uid) base
      LEFT JOIN user_config uc ON uc.user_id = base.uid
      RETURNING id INTO hid;

      -- El usuario migrado es el propietario inicial del hogar.
      INSERT INTO household_members (household_id, user_id, role)
      VALUES (hid, u.user_id, 'owner');
    END IF;

    UPDATE accounts             SET household_id = hid WHERE user_id = u.user_id AND household_id IS NULL;
    UPDATE transactions         SET household_id = hid WHERE user_id = u.user_id AND household_id IS NULL;
    UPDATE user_config          SET household_id = hid WHERE user_id = u.user_id AND household_id IS NULL;
    UPDATE categorization_rules SET household_id = hid WHERE user_id = u.user_id AND household_id IS NULL;
    UPDATE push_subscriptions   SET household_id = hid WHERE user_id = u.user_id AND household_id IS NULL;
  END LOOP;
END $$;

-- ============================================================
-- 3. household_id pasa a NOT NULL (ya backfilleado)
-- ============================================================
ALTER TABLE accounts             ALTER COLUMN household_id SET NOT NULL;
ALTER TABLE transactions         ALTER COLUMN household_id SET NOT NULL;
ALTER TABLE user_config          ALTER COLUMN household_id SET NOT NULL;
ALTER TABLE categorization_rules ALTER COLUMN household_id SET NOT NULL;
ALTER TABLE push_subscriptions   ALTER COLUMN household_id SET NOT NULL;

-- ============================================================
-- 4. Índices por household_id
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_accounts_household             ON accounts(household_id);
CREATE INDEX IF NOT EXISTS idx_transactions_household_date    ON transactions(household_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_categorization_rules_household ON categorization_rules(household_id, priority DESC) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_household   ON push_subscriptions(household_id);

-- ============================================================
-- 5. Reescribir constraints únicas: dedupe a nivel de hogar.
-- ============================================================
-- Las cuentas pertenecen al hogar, así que la deduplicación de external_id /
-- iban / cuenta manual debe ser por household_id, no por user_id.

-- transactions: la UNIQUE inline del schema inicial se llama
-- transactions_user_id_external_id_key.
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_user_id_external_id_key;
ALTER TABLE transactions ADD  CONSTRAINT transactions_household_external_unique UNIQUE (household_id, external_id);

-- accounts: external_id
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_user_external_unique;
ALTER TABLE accounts ADD  CONSTRAINT accounts_household_external_unique UNIQUE (household_id, external_id);

-- accounts: iban (índice parcial)
DROP INDEX IF EXISTS accounts_user_iban_unique;
CREATE UNIQUE INDEX IF NOT EXISTS accounts_household_iban_unique
  ON accounts (household_id, iban)
  WHERE iban IS NOT NULL;

-- accounts: una única cuenta manual por hogar
DROP INDEX IF EXISTS accounts_user_manual_unique;
CREATE UNIQUE INDEX IF NOT EXISTS accounts_household_manual_unique
  ON accounts (household_id)
  WHERE source = 'manual';
