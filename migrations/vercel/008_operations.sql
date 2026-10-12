SET search_path TO model_drops;
CREATE TABLE operational_checks (
  name text PRIMARY KEY,
  run_id text NOT NULL,
  started_at text NOT NULL,
  finished_at text,
  status text NOT NULL CHECK(status IN ('running','ok','failed'))
);
CREATE TABLE auth_rate_limits (
  key text PRIMARY KEY,
  window_start bigint NOT NULL,
  attempts integer NOT NULL CHECK(attempts > 0)
);
CREATE INDEX auth_rate_limits_expiry ON auth_rate_limits(window_start);
REVOKE ALL ON operational_checks, auth_rate_limits FROM PUBLIC, anon, authenticated;
