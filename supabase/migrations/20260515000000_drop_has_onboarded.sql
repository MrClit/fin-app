-- Eliminar la columna has_onboarded de user_config.
-- El flujo de onboarding ya no existe (app personal de un solo usuario,
-- ver issue #57): login lleva directamente al dashboard.
ALTER TABLE user_config DROP COLUMN IF EXISTS has_onboarded;
