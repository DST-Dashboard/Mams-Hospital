-- 007_manual_reading_user.sql: Record authenticated user ID on manual readings
ALTER TABLE readings ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_readings_user_id ON readings (user_id);

