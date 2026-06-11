-- Issue #131 (Fase 1): reescribir la RLS de las tablas de datos.
-- La visibilidad pasa de "fila propia" (auth.uid() = user_id) a "fila del hogar
-- al que pertenece el usuario" (household_id IN current_household_ids()).
--
-- Ejecutar en Supabase SQL Editor como un único bloque.

-- accounts
DROP POLICY IF EXISTS "Users access own accounts" ON accounts;
CREATE POLICY "Household members access accounts" ON accounts
  FOR ALL USING (household_id IN (SELECT current_household_ids()))
  WITH CHECK (household_id IN (SELECT current_household_ids()));

-- transactions
DROP POLICY IF EXISTS "Users access own transactions" ON transactions;
CREATE POLICY "Household members access transactions" ON transactions
  FOR ALL USING (household_id IN (SELECT current_household_ids()))
  WITH CHECK (household_id IN (SELECT current_household_ids()));

-- user_config
DROP POLICY IF EXISTS "Users access own config" ON user_config;
CREATE POLICY "Household members access config" ON user_config
  FOR ALL USING (household_id IN (SELECT current_household_ids()))
  WITH CHECK (household_id IN (SELECT current_household_ids()));

-- categorization_rules
DROP POLICY IF EXISTS "own_rules" ON categorization_rules;
CREATE POLICY "Household members access rules" ON categorization_rules
  FOR ALL USING (household_id IN (SELECT current_household_ids()))
  WITH CHECK (household_id IN (SELECT current_household_ids()));

-- push_subscriptions
DROP POLICY IF EXISTS "Users access own push subscriptions" ON push_subscriptions;
CREATE POLICY "Household members access push subscriptions" ON push_subscriptions
  FOR ALL USING (household_id IN (SELECT current_household_ids()))
  WITH CHECK (household_id IN (SELECT current_household_ids()));
