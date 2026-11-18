-- 001_init.sql: PostgreSQL baseline schema for OHTMS
-- Timestamps are BIGINT (epoch ms UTC) to preserve existing DTOs, rules, charts and tests.

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS devices (
  device_id  TEXT PRIMARY KEY,
  dev_eui    TEXT,
  dev_addr   TEXT,
  gateway_id TEXT,
  model      TEXT,
  latitude   DOUBLE PRECISION,
  longitude  DOUBLE PRECISION,
  simulated  BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at BIGINT,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS tanks (
  id                 INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  device_id          TEXT UNIQUE REFERENCES devices(device_id),
  label              TEXT NOT NULL,
  zone               TEXT,
  location           TEXT,
  status             TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','maintenance','offline','decommissioned')),
  shape              TEXT NOT NULL DEFAULT 'cylinder' CHECK (shape IN ('cylinder','rectangle')),
  height_cm          DOUBLE PRECISION NOT NULL CHECK (height_cm > 0),
  radius_cm          DOUBLE PRECISION,
  width_cm           DOUBLE PRECISION,
  length_cm          DOUBLE PRECISION,
  dead_zone_cm       DOUBLE PRECISION NOT NULL DEFAULT 25,
  dims_confirmed     BOOLEAN NOT NULL DEFAULT FALSE,
  warn_pct           DOUBLE PRECISION NOT NULL DEFAULT 40,
  crit_pct           DOUBLE PRECISION NOT NULL DEFAULT 20,
  empty_pct          DOUBLE PRECISION NOT NULL DEFAULT 5,
  overflow_margin_cm DOUBLE PRECISION NOT NULL DEFAULT 10,
  persistence        INTEGER NOT NULL DEFAULT 3,
  cooldown_min       INTEGER NOT NULL DEFAULT 30,
  hysteresis_pct     DOUBLE PRECISION NOT NULL DEFAULT 5,
  no_data_min        INTEGER NOT NULL DEFAULT 15,
  spike_cm           DOUBLE PRECISION NOT NULL DEFAULT 80,
  quiet_start        TEXT,
  quiet_end          TEXT,
  deleted_at         BIGINT,
  created_at         BIGINT NOT NULL,
  updated_at         BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS readings (
  device_id    TEXT NOT NULL,
  t            BIGINT NOT NULL,
  distance_cm  INTEGER,
  f_cnt        INTEGER,
  rssi         INTEGER,
  snr          DOUBLE PRECISION,
  battery_pct  INTEGER,
  gateway_id   TEXT,
  source       TEXT NOT NULL DEFAULT 'ttn',
  PRIMARY KEY (device_id, t)
);
CREATE INDEX IF NOT EXISTS idx_readings_t ON readings (t);

CREATE TABLE IF NOT EXISTS alerts (
  id                  INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tank_id             INTEGER NOT NULL REFERENCES tanks(id),
  type                TEXT NOT NULL,
  severity            TEXT NOT NULL CHECK (severity IN ('info','warning','critical','emergency')),
  state               TEXT NOT NULL DEFAULT 'active' CHECK (state IN ('active','acknowledged','snoozed','resolved','suppressed','escalated')),
  message             TEXT NOT NULL,
  value               DOUBLE PRECISION,
  opened_at           BIGINT NOT NULL,
  acknowledged_at     BIGINT,
  acknowledged_by     INTEGER,
  ack_note            TEXT,
  resolved_at         BIGINT,
  snoozed_until       BIGINT,
  trigger_t           BIGINT,
  trigger_distance_cm INTEGER,
  simulated           BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_alerts_open ON alerts (tank_id, type) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_alerts_time ON alerts (opened_at DESC);

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email         TEXT NOT NULL,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('viewer','operator','admin')),
  disabled      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    BIGINT NOT NULL,
  last_login_at BIGINT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_lower_email ON users (lower(email));

CREATE TABLE IF NOT EXISTS audit_log (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  t           BIGINT NOT NULL,
  user_id     INTEGER,
  action      TEXT NOT NULL,
  entity      TEXT NOT NULL,
  entity_id   TEXT,
  before_json JSONB,
  after_json  JSONB,
  ip          TEXT
);
CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_log (t DESC);

CREATE TABLE IF NOT EXISTS notifications (
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  alert_id   INTEGER REFERENCES alerts(id),
  channel    TEXT NOT NULL,
  recipient  TEXT,
  status     TEXT NOT NULL,
  sent_at    BIGINT,
  error      TEXT
);

