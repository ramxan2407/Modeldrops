// Apply to a chosen demo database before enabling DEMO_MODE. No environment file
// is loaded implicitly: the operator chooses the target using Node --env-file.
import { Pool } from "pg";
import { readFile } from "node:fs/promises";
import { supabaseCa } from "../lib/vercel/tls.mjs";
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true, ca: supabaseCa },
  max: 1,
});
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(781942631)");
  const prerequisites = await client.query(
    "SELECT to_regclass('model_drops.character_orders') orders, EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='model_drops' AND table_name='provider_requests' AND column_name='character_reference') references_ready",
  );
  if (!prerequisites.rows[0].orders || !prerequisites.rows[0].references_ready)
    throw new Error("Apply workspace migrations 001–005 first.");
  await client.query(
    await readFile(
      new URL("../migrations/vercel/006_demo_credits.sql", import.meta.url),
      "utf8",
    ),
  );
  await client.query("COMMIT");
  console.log(
    "Demo wallet migration applied. Existing balances remain in the standard wallet.",
  );
} catch (error) {
  await client.query("ROLLBACK");
  console.error(error instanceof Error ? error.message : "Migration failed");
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
