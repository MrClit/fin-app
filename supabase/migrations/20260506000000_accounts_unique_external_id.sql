-- Permite upsert seguro en accounts al reconectar el mismo banco
-- external_id puede ser NULL (cuentas manuales), de ahí el WHERE
CREATE UNIQUE INDEX idx_accounts_user_external
  ON accounts(user_id, external_id)
  WHERE external_id IS NOT NULL;
