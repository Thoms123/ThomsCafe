-- Per-day operating hours, replacing the single open_time/close_time pair in
-- store_settings. day_of_week follows Go's time.Weekday (0=Sunday..6=Saturday).
--
-- Migrations here re-run on every boot (see config.RunMigrations), so the
-- store_settings backfill is wrapped in a DO block: plpgsql only plans a
-- statement when it's actually reached, so the SELECT ... FROM store_settings
-- branch stays valid SQL even after the table is dropped below and this file
-- runs again on a later boot.
CREATE TABLE IF NOT EXISTS store_hours (
    day_of_week SMALLINT PRIMARY KEY CHECK (day_of_week BETWEEN 0 AND 6),
    open_time   VARCHAR(5) NOT NULL DEFAULT '08:00',
    close_time  VARCHAR(5) NOT NULL DEFAULT '22:00',
    is_closed   BOOLEAN NOT NULL DEFAULT false
);

DO $$
DECLARE
    default_open  VARCHAR(5) := '08:00';
    default_close VARCHAR(5) := '22:00';
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'store_settings') THEN
        SELECT open_time, close_time INTO default_open, default_close FROM store_settings WHERE id = 1;
    END IF;

    INSERT INTO store_hours (day_of_week, open_time, close_time)
    SELECT d, default_open, default_close
    FROM generate_series(0, 6) AS d
    WHERE NOT EXISTS (SELECT 1 FROM store_hours WHERE day_of_week = d);
END $$;

DROP TABLE IF EXISTS store_settings;
