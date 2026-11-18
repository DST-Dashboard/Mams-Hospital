-- Track device retirement independently from tank assignment/deletion.
ALTER TABLE devices ADD COLUMN deleted_at INTEGER;
