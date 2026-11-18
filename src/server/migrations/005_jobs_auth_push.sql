-- [BE-12/16] Persist scheduler state, rollups, TOTP credentials, and push subscriptions.
CREATE TABLE IF NOT EXISTS reading_rollups (
  device_id TEXT NOT NULL,
  resolution_ms INTEGER NOT NULL CHECK (resolution_ms IN (3600000, 86400000)),
  bucket_t INTEGER NOT NULL,
  distance_avg REAL NOT NULL,
  distance_min REAL NOT NULL,
  distance_max REAL NOT NULL,
  sample_count INTEGER NOT NULL CHECK (sample_count > 0),
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (device_id, resolution_ms, bucket_t)
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS job_runs (
  name TEXT PRIMARY KEY,
  last_run_at INTEGER NOT NULL,
  ok INTEGER NOT NULL CHECK (ok IN (0, 1)),
  error TEXT
);

CREATE TABLE IF NOT EXISTS notification_dispatches (
  alert_id INTEGER PRIMARY KEY REFERENCES alerts(id) ON DELETE CASCADE,
  attempted_at INTEGER NOT NULL,
  completed_at INTEGER,
  error TEXT
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_used_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_escalation ON alerts (state, opened_at);

ALTER TABLE users ADD COLUMN totp_secret TEXT;
ALTER TABLE users ADD COLUMN totp_pending_secret TEXT;
ALTER TABLE users ADD COLUMN totp_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN totp_last_used_counter INTEGER;
ALTER TABLE notifications ADD COLUMN attempted_at INTEGER;
CREATE INDEX IF NOT EXISTS idx_notifications_retry ON notifications (alert_id, status, attempted_at);
