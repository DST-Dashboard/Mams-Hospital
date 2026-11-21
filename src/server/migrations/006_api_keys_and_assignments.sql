-- 006_api_keys_and_assignments.sql: API Keys for generic REST API and Tank Owner assignments

CREATE TABLE IF NOT EXISTS api_keys (
  id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  name         TEXT NOT NULL,
  key_hash     TEXT NOT NULL UNIQUE,
  key_prefix   TEXT NOT NULL,
  role         TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('viewer', 'operator', 'admin')),
  tank_id      INTEGER REFERENCES tanks(id) ON DELETE CASCADE,
  created_at   BIGINT NOT NULL,
  expires_at   BIGINT,
  revoked_at   BIGINT,
  last_used_at BIGINT
);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys (user_id);

CREATE TABLE IF NOT EXISTS tank_assignments (
  tank_id     INTEGER NOT NULL REFERENCES tanks(id) ON DELETE CASCADE,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at BIGINT NOT NULL,
  PRIMARY KEY (tank_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_tank_assignments_user ON tank_assignments (user_id);
