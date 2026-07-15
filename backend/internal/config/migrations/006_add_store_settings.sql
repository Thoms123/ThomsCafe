CREATE TABLE IF NOT EXISTS store_settings (
    id         SERIAL PRIMARY KEY,
    open_time  VARCHAR(5) NOT NULL DEFAULT '08:00',
    close_time VARCHAR(5) NOT NULL DEFAULT '22:00'
);

-- Singleton row (id=1) holding the store's daily operating hours, same for every day.
INSERT INTO store_settings (id, open_time, close_time)
SELECT 1, '08:00', '22:00'
WHERE NOT EXISTS (SELECT 1 FROM store_settings WHERE id = 1);
