// Explicit deployment operation; never imported by the application or tests.
import { Pool } from "pg";
import { supabaseCa } from "../lib/vercel/tls.mjs";

const origin = new URL(process.env.APP_ORIGIN || "");
if (
  origin.protocol !== "https:" ||
  origin.username ||
  origin.password ||
  origin.pathname !== "/" ||
  origin.search ||
  origin.hash
) {
  throw new Error("APP_ORIGIN must be the canonical HTTPS application origin.");
}
if (!process.env.DATABASE_URL || !process.env.CRON_SECRET?.trim()) {
  throw new Error("DATABASE_URL and CRON_SECRET are required.");
}
const endpoint = `${origin.origin}/api/jobs`;
const probe = await fetch(endpoint, {
  method: "POST",
  redirect: "error",
  signal: AbortSignal.timeout(30000),
  headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
});
if (!probe.ok)
  throw new Error(`Job endpoint check failed: HTTP ${probe.status}.`);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true, ca: supabaseCa },
  max: 1,
  connectionTimeoutMillis: 15000,
  query_timeout: 30000,
});
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(781942631)");
  await client.query("CREATE EXTENSION IF NOT EXISTS pg_cron");
  await client.query("CREATE EXTENSION IF NOT EXISTS pg_net");
  const grants = await client.query(
    "SELECT has_table_privilege('anon','vault.decrypted_secrets','SELECT') AS anon, has_table_privilege('authenticated','vault.decrypted_secrets','SELECT') AS authenticated",
  );
  if (grants.rows[0].anon || grants.rows[0].authenticated) {
    throw new Error(
      "Vault secrets must be inaccessible to public application roles.",
    );
  }
  for (const [name, value] of [
    ["model_drops_job_endpoint", endpoint],
    ["model_drops_cron_secret", process.env.CRON_SECRET],
  ]) {
    const existing = await client.query(
      "SELECT id FROM vault.secrets WHERE name=$1",
      [name],
    );
    if (existing.rows.length) {
      await client.query("SELECT vault.update_secret($1,$2,$3)", [
        existing.rows[0].id,
        value,
        name,
      ]);
    } else {
      await client.query("SELECT vault.create_secret($1,$2,$3)", [
        value,
        name,
        "Model Drops background job delivery",
      ]);
    }
  }
  const command = `SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='model_drops_job_endpoint'),
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='model_drops_cron_secret')),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );`;
  const result = await client.query("SELECT cron.schedule($1,$2,$3) AS id", [
    "model-drops-background-jobs",
    "* * * * *",
    command,
  ]);
  await client.query("COMMIT");
  console.log(
    JSON.stringify({
      scheduler: "Supabase Cron",
      jobId: result.rows[0].id,
      interval: "every minute",
      endpoint,
      secretStoredInVault: true,
      publicSecretAccess: false,
    }),
  );
} catch (error) {
  await client.query("ROLLBACK");
  // Avoid logging SQL or provider credentials on a configuration failure.
  console.error("Scheduler setup failed", error.code || error.name);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
