-- Reglas de categorización persistentes definidas por el usuario.
-- Se evalúan en orden de prioridad antes que las reglas estáticas de lib/categories.ts.
-- Ref: §14.1 del spec.

CREATE TABLE categorization_rules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pattern     TEXT NOT NULL,
  field       TEXT NOT NULL CHECK (field IN ('description', 'merchant', 'iban')),
  category_id TEXT NOT NULL REFERENCES categories(id),
  priority    INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE categorization_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_rules" ON categorization_rules
  FOR ALL USING (user_id = auth.uid());

CREATE INDEX idx_categorization_rules_user
  ON categorization_rules (user_id, priority DESC)
  WHERE is_active;
