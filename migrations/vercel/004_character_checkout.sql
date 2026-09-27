SET search_path TO model_drops,public;
CREATE TABLE IF NOT EXISTS character_orders (
 id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL REFERENCES users(id), character_id TEXT NOT NULL,
 amount_cents BIGINT NOT NULL CHECK(amount_cents>=0), currency TEXT NOT NULL DEFAULT 'usd',
 mode TEXT NOT NULL CHECK(mode IN ('test','payment')), status TEXT NOT NULL CHECK(status IN ('test_completed','paid','refunded')),
 license_snapshot TEXT NOT NULL, idempotency_key TEXT NOT NULL UNIQUE,
 created_at TEXT NOT NULL DEFAULT to_char(clock_timestamp() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
);
CREATE TABLE IF NOT EXISTS character_entitlements (
 user_id TEXT NOT NULL REFERENCES users(id), character_id TEXT NOT NULL, order_id TEXT NOT NULL REFERENCES character_orders(id),
 status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','revoked')), PRIMARY KEY(user_id,character_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS character_test_order_once ON character_orders(user_id,character_id) WHERE mode='test';
