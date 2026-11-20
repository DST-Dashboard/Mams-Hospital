-- 006_manual_entry_tank_owners.sql: Add owner_id to tanks and index on readings source

ALTER TABLE tanks ADD COLUMN IF NOT EXISTS owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tanks_owner ON tanks (owner_id);
CREATE INDEX IF NOT EXISTS idx_readings_source ON readings (source);


