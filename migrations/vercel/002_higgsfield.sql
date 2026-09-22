SET search_path TO model_drops;
CREATE TABLE IF NOT EXISTS provider_requests (
 generation_id text PRIMARY KEY NOT NULL REFERENCES generations(id),
 endpoint text NOT NULL,
 input_json text NOT NULL,
 request_id text UNIQUE,
 state text NOT NULL DEFAULT 'ready',
 reserved_microusd bigint NOT NULL CHECK(reserved_microusd >= 0),
 created_at text NOT NULL,
 updated_at text NOT NULL
);
CREATE INDEX IF NOT EXISTS provider_requests_created ON provider_requests(created_at);
REVOKE ALL ON provider_requests FROM PUBLIC;
