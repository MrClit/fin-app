-- Issue #115: Notificaciones push (Web Push API)
-- Tabla de suscripciones push por usuario + columna de dedupe del aviso de caducidad PSD2.
--
-- Ejecutar en Supabase SQL Editor como un único bloque.

-- ============================================================
-- TABLA: push_subscriptions
-- ============================================================
-- Una fila por endpoint del navegador. Un mismo usuario puede tener varias
-- (varios dispositivos / navegadores). El endpoint es único globalmente.
CREATE TABLE push_subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL UNIQUE,   -- URL del push service del navegador
  p256dh      TEXT NOT NULL,          -- clave pública de la suscripción (cifrado)
  auth        TEXT NOT NULL,          -- secreto de autenticación de la suscripción
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own push subscriptions"
  ON push_subscriptions FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- accounts: dedupe del aviso de caducidad PSD2
-- ============================================================
-- Guarda el valor de consent_expires_at para el que ya se envió el aviso de
-- "caduca en ≤7 días", para no reenviarlo cada día. Al renovar el consentimiento
-- cambia consent_expires_at y el callback resetea esta columna a NULL, dejando
-- la cuenta elegible para un nuevo aviso en el siguiente ciclo de caducidad.
ALTER TABLE accounts ADD COLUMN consent_reminder_sent_for TIMESTAMP WITH TIME ZONE;
