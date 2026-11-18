-- 004_dimensions.sql: Historic tank dimensions for "apply from now on only" support

CREATE TABLE IF NOT EXISTS tank_dimensions (
  id             INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tank_id        INTEGER NOT NULL REFERENCES tanks(id) ON DELETE CASCADE,
  height_cm      DOUBLE PRECISION NOT NULL,
  radius_cm      DOUBLE PRECISION,
  width_cm       DOUBLE PRECISION,
  length_cm      DOUBLE PRECISION,
  dead_zone_cm   DOUBLE PRECISION NOT NULL,
  effective_from BIGINT NOT NULL,
  created_at     BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tank_dimensions_effective ON tank_dimensions (tank_id, effective_from DESC);
