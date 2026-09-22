import { supabaseCa } from "../lib/vercel/tls.mjs";
import { Pool } from "pg";
import { readFile } from "node:fs/promises";
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
  const existing = await client.query(
    "SELECT to_regclass('model_drops.generations') AS name",
  );
  if (!existing.rows[0].name)
    throw new Error("Create the workspace schema first.");
  await client.query(
    await readFile(
      new URL("../migrations/vercel/002_higgsfield.sql", import.meta.url),
      "utf8",
    ),
  );
  await client.query("COMMIT");
  console.log(
    "Higgsfield job tracking schema is ready. Existing records preserved.",
  );
} catch (error) {
  await client.query("ROLLBACK");
  console.error(error.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
