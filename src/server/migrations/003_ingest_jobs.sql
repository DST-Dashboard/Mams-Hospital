-- 003_ingest_jobs.sql: Ingest state, rejects, atomic job tracking, and rate limiting

CREATE TABLE IF NOT EXISTS ingest_state (
  device_id        TEXT PRIMARY KEY,
  last_f_cnt       INTEGER,
  last_t           BIGINT,
  last_uplink_at   BIGINT,
  last_gateway_id  TEXT,
  backfill_cursor  TEXT
);

CREATE TABLE IF NOT EXISTS ingest_rejects (
  id        INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  t         BIGINT NOT NULL,
  reason    TEXT NOT NULL,
  payload   JSONB,
  source_ip TEXT
);
CREATE INDEX IF NOT EXISTS idx_ingest_rejects_t ON ingest_rejects (t DESC);

CREATE TABLE IF NOT EXISTS job_runs (
  name         TEXT PRIMARY KEY,
  last_run_at  BIGINT NOT NULL,
  ok           BOOLEAN NOT NULL DEFAULT TRUE,
  error        TEXT
);

CREATE TABLE IF NOT EXISTS rate_limits (
  key               TEXT PRIMARY KEY,
  attempts          INTEGER NOT NULL DEFAULT 0,
  first_attempt_at  BIGINT NOT NULL,
  locked_until      BIGINT
);

