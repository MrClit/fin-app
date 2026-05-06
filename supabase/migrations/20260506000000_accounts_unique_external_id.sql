-- Permite upsert seguro en accounts al reconectar el mismo banco
-- UNIQUE constraint (no índice parcial) para que ON CONFLICT funcione con el cliente Supabase
DROP INDEX IF EXISTS idx_accounts_user_external;
ALTER TABLE accounts ADD CONSTRAINT accounts_user_external_unique UNIQUE (user_id, external_id);
