-- [BE-06] OWNER: backend · Tables: zones, threshold_templates; tanks.zone_id
CREATE TABLE IF NOT EXISTS zones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS threshold_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  warn_pct REAL NOT NULL DEFAULT 40,
  crit_pct REAL NOT NULL DEFAULT 20,
  empty_pct REAL NOT NULL DEFAULT 5,
  overflow_margin_cm REAL NOT NULL DEFAULT 10,
  persistence INTEGER NOT NULL DEFAULT 3,
  cooldown_min INTEGER NOT NULL DEFAULT 30,
  hysteresis_pct REAL NOT NULL DEFAULT 5,
  no_data_min INTEGER NOT NULL DEFAULT 15,
  spike_cm REAL NOT NULL DEFAULT 80,
  created_at INTEGER NOT NULL
);
