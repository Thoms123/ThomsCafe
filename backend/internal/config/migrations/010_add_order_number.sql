-- Human-facing order number: YYYYMMDDHHMM (creation time, WIB) + a 3-digit
-- sequence that resets daily. The daily_order_sequences table is an atomic
-- per-day counter so concurrent order creation never hands out duplicates.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number VARCHAR(20) NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS daily_order_sequences (
    seq_date DATE PRIMARY KEY,
    counter  INT NOT NULL DEFAULT 0
);

-- Backfill any existing orders that predate this column.
WITH numbered AS (
    SELECT id, created_at,
           ROW_NUMBER() OVER (
               PARTITION BY (created_at AT TIME ZONE 'Asia/Jakarta')::date
               ORDER BY id
           ) AS seq
    FROM orders
    WHERE order_number = ''
)
UPDATE orders o
SET order_number = to_char(n.created_at AT TIME ZONE 'Asia/Jakarta', 'YYYYMMDDHH24MI') || lpad(n.seq::text, 3, '0')
FROM numbered n
WHERE o.id = n.id;

-- Seed each day's counter from backfilled orders so new orders continue the
-- sequence instead of restarting it.
INSERT INTO daily_order_sequences (seq_date, counter)
SELECT (created_at AT TIME ZONE 'Asia/Jakarta')::date, COUNT(*)
FROM orders
GROUP BY (created_at AT TIME ZONE 'Asia/Jakarta')::date
ON CONFLICT (seq_date) DO UPDATE SET counter = GREATEST(daily_order_sequences.counter, EXCLUDED.counter);

CREATE UNIQUE INDEX IF NOT EXISTS orders_order_number_idx ON orders (order_number);
