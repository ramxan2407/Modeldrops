import { supabaseCa } from "../lib/vercel/tls.mjs";
import { Pool } from "pg";
import { readFile } from "node:fs/promises";
if (
  !process.env.DATABASE_URL ||
  process.env.DATABASE_URL.includes("YOUR-PASSWORD")
)
  throw new Error("Set DATABASE_URL in .env.vercel.local first");
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
    "SELECT to_regclass('model_drops.users') AS name",
  );
  if (existing.rows[0].name)
    throw new Error("Workspace schema already exists. No changes applied.");
  await client.query(
    await readFile(
      new URL("../migrations/vercel/001_workspace.sql", import.meta.url),
      "utf8",
    ),
  );
  await client.query("COMMIT");
  console.log(
    "Model Drops workspace schema created successfully. Existing Supabase Auth is unchanged.",
  );
} catch (error) {
  await client.query("ROLLBACK");
  console.error(error.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
