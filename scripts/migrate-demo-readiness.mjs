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
  const exists = await client.query(
    "SELECT to_regclass('model_drops.demo_testers') AS name",
  );
  if (exists.rows[0].name)
    throw new Error("Readiness migration already applied; no changes made.");
  await client.query(
    await readFile(
      new URL("../migrations/vercel/007_demo_readiness.sql", import.meta.url),
      "utf8",
    ),
  );
  await client.query("COMMIT");
  console.log(
    "Demo readiness migration applied. Approve tester emails and review character outputs before new purchases.",
  );
} catch (error) {
  await client.query("ROLLBACK");
  console.error(error instanceof Error ? error.message : "Migration failed");
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
