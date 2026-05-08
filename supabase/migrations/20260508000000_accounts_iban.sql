ALTER TABLE accounts ADD COLUMN IF NOT EXISTS iban TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS accounts_user_iban_unique
  ON accounts (user_id, iban)
  WHERE iban IS NOT NULL;
