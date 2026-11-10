-- OHTMS runtime store (SQLite). Readings keep the SAME shape as the original Supabase `uplinks`
-- table (device + time + distance) with the signal columns promoted out of the JSON blob.
-- Derived values (level, %, litres) are NEVER stored — changing tank H/R recomputes history instantly.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS devices (
  device_id  TEXT PRIMARY KEY,
  dev_eui    TEXT, dev_addr TEXT, gateway_id TEXT, model TEXT,
  latitude   REAL, longitude REAL,
  simulated  INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS tanks (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id     TEXT UNIQUE REFERENCES devices(device_id),
  label         TEXT NOT NULL,
  zone          TEXT, location TEXT,
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','maintenance','offline','decommissioned')),
  shape         TEXT NOT NULL DEFAULT 'cylinder' CHECK (shape IN ('cylinder','rectangle')),
  height_cm     REAL NOT NULL CHECK (height_cm > 0),
  radius_cm     REAL, width_cm REAL, length_cm REAL,
  dead_zone_cm  REAL NOT NULL DEFAULT 25,
  dims_confirmed INTEGER NOT NULL DEFAULT 0,        -- 0 until an admin confirms H/R (first-load modal, C-01)
  warn_pct REAL NOT NULL DEFAULT 40, crit_pct REAL NOT NULL DEFAULT 20, empty_pct REAL NOT NULL DEFAULT 5,
  overflow_margin_cm REAL NOT NULL DEFAULT 10, persistence INTEGER NOT NULL DEFAULT 3,
  cooldown_min INTEGER NOT NULL DEFAULT 30, hysteresis_pct REAL NOT NULL DEFAULT 5,
  no_data_min INTEGER NOT NULL DEFAULT 15, spike_cm REAL NOT NULL DEFAULT 80,
  quiet_start TEXT, quiet_end TEXT,
  deleted_at INTEGER,                                 -- soft delete (restorable for 90 days)
  created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS readings (
  device_id   TEXT NOT NULL,
  t           INTEGER NOT NULL,                       -- epoch ms UTC
  distance_cm INTEGER,
  f_cnt INTEGER, rssi INTEGER, snr REAL, battery_pct INTEGER,
  PRIMARY KEY (device_id, t)
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS idx_readings_t ON readings (t);

CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tank_id INTEGER NOT NULL REFERENCES tanks(id),
  type TEXT NOT NULL, severity TEXT NOT NULL CHECK (severity IN ('info','warning','critical','emergency')),
  state TEXT NOT NULL DEFAULT 'active' CHECK (state IN ('active','acknowledged','snoozed','resolved','suppressed','escalated')),
  message TEXT NOT NULL, value REAL,
  opened_at INTEGER NOT NULL, acknowledged_at INTEGER, acknowledged_by INTEGER, ack_note TEXT,
  resolved_at INTEGER, snoozed_until INTEGER,
  trigger_t INTEGER, trigger_distance_cm INTEGER,     -- the raw reading that fired it (forensics, §5.8)
  simulated INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_alerts_open ON alerts (tank_id, type) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_alerts_time ON alerts (opened_at DESC);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
  password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK (role IN ('viewer','operator','admin')),
  disabled INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, last_login_at INTEGER
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT, t INTEGER NOT NULL, user_id INTEGER,
  action TEXT NOT NULL, entity TEXT NOT NULL, entity_id TEXT, before_json TEXT, after_json TEXT, ip TEXT
);
CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_log (t DESC);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT, alert_id INTEGER REFERENCES alerts(id),
  channel TEXT NOT NULL, recipient TEXT, status TEXT NOT NULL, sent_at INTEGER, error TEXT
);
