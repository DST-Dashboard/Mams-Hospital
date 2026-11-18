-- 002_alerts_notify.sql: Alert events, recipients, notification prefs, and delivery tracking

CREATE TABLE IF NOT EXISTS alert_events (
  id        INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  alert_id  INTEGER NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
  event     TEXT NOT NULL,
  actor_id  INTEGER,
  note      TEXT,
  t         BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_alert_events_alert ON alert_events (alert_id, t ASC);

CREATE TABLE IF NOT EXISTS alert_recipients (
  tank_id    INTEGER NOT NULL REFERENCES tanks(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channels   JSONB NOT NULL DEFAULT '["in_app", "email"]'::jsonb,
  tier       INTEGER NOT NULL DEFAULT 1,
  created_at BIGINT NOT NULL,
  PRIMARY KEY (tank_id, user_id)
);

CREATE TABLE IF NOT EXISTS notification_prefs (
  user_id             INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email_alerts        BOOLEAN NOT NULL DEFAULT TRUE,
  daily_digest        BOOLEAN NOT NULL DEFAULT FALSE,
  quiet_hours_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  quiet_hours_start   TEXT DEFAULT '22:00',
  quiet_hours_end     TEXT DEFAULT '06:00',
  updated_at          BIGINT NOT NULL
);

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS attempted_at BIGINT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS next_retry_at BIGINT;
CREATE INDEX IF NOT EXISTS idx_notifications_retry ON notifications (status, next_retry_at);
