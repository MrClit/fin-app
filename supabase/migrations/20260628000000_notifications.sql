-- Issue #177: Notificaciones in-app de fallo de scrapers.
--
-- Tabla genérica de notificaciones in-app con estado leído/no leído. La campana
-- del header muestra un badge con el nº de no leídas y, al pulsarla, la lista.
-- Primer productor: los webhooks de fallo de scraper (/api/scrapers/notify), pero
-- la tabla no se acopla a ellos (`source`/`kind` nullable para futuros avisos).
--
-- Ejecutar en Supabase SQL Editor como un único bloque.

-- ============================================================
-- TABLA: notifications
-- ============================================================
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source      TEXT,        -- 'edenred' | 'sabadell_visa' (productor; NULL para otros avisos)
  kind        TEXT,        -- 'session_expired' | '2fa'
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  url         TEXT,        -- deep-link al pulsar (p. ej. '/accounts')
  read_at     TIMESTAMP WITH TIME ZONE, -- NULL = no leída
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Conteo de no leídas (badge): índice parcial barato para `read_at IS NULL`.
CREATE INDEX idx_notifications_user_unread ON notifications(user_id) WHERE read_at IS NULL;
-- Historial ordenado para la lista de la campana.
CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own notifications"
  ON notifications FOR ALL USING (auth.uid() = user_id);
