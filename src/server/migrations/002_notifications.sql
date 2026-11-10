-- [BE-07] OWNER: backend · Tables: alert_recipients, notification_prefs
CREATE TABLE IF NOT EXISTS alert_recipients (
  tank_id INTEGER NOT NULL REFERENCES tanks(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channels TEXT NOT NULL DEFAULT '["in_app"]',
  created_at INTEGER NOT NULL,
  PRIMARY KEY (tank_id, user_id)
);

CREATE TABLE IF NOT EXISTS notification_prefs (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  prefs_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
