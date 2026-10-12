import { Pool } from "pg";
import { readFile } from "node:fs/promises";
import { supabaseCa } from "../lib/vercel/tls.mjs";
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
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
  const existing = await client.query(
    "SELECT to_regclass('model_drops.operational_checks') name",
  );
  if (!existing.rows[0].name)
    await client.query(
      await readFile(
        new URL("../migrations/vercel/008_operations.sql", import.meta.url),
        "utf8",
      ),
    );
  await client.query("COMMIT");
  console.log(
    existing.rows[0].name
      ? "Operations schema already present."
      : "Operations schema installed. Existing users, credits and content are unchanged.",
  );
} catch (error) {
  await client.query("ROLLBACK");
  console.error("Operations migration failed", error.code || error.name);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
