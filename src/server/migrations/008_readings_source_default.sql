-- 008_readings_source_default.sql: readings no longer originate from The Things Stack.
-- Only the column DEFAULT changes (metadata-only, instant). Historical rows keep their original
-- source label so past provenance is preserved.
ALTER TABLE readings ALTER COLUMN source SET DEFAULT 'api';
