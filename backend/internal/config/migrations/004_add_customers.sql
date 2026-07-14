CREATE TABLE IF NOT EXISTS customers (
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    phone      VARCHAR(20) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id INT REFERENCES customers(id);
