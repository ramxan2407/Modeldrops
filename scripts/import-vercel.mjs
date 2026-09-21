import { Pool } from "pg";
import { readFile } from "node:fs/promises";
import { supabaseCa } from "../lib/vercel/tls.mjs";
const rows = JSON.parse(await readFile(".env.vercel-data.json", "utf8"));
const order = [
  "users",
  "ai_models",
  "credit_packages",
  "projects",
  "generations",
  "generation_assets",
  "generation_jobs",
  "credit_transactions",
  "audit_logs",
  "character_controls",
  "character_purchases",
  "creator_listings",
  "favorites",
  "notifications",
  "reports",
  "training_settings",
  "training_requests",
  "training_files",
  "training_parts",
  "training_events",
  "training_emails",
  "trained_loras",
];
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true, ca: supabaseCa },
  max: 1,
});
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query("SET LOCAL search_path TO model_drops");
  await client.query("SELECT pg_advisory_xact_lock(781942631)");
  const tables = await client.query(
    "SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='model_drops'",
  );
  let count = 0;
  for (const table of order) {
    const allowed = new Set(
      tables.rows
        .filter((r) => r.table_name === table)
        .map((r) => r.column_name),
    );
    const records = rows[table] || [];
    if (table === "credit_transactions")
      records.sort(
        (a, b) =>
          a.user_id.localeCompare(b.user_id) ||
          a.created_at.localeCompare(b.created_at) ||
          a.balance_before - b.balance_before,
      );
    for (const row of records) {
      const keys = Object.keys(row);
      if (keys.some((k) => !allowed.has(k)))
        throw new Error("Export schema mismatch");
      const values = keys.map((k) => row[k]);
      await client.query(
        `INSERT INTO "${table}" (${keys.map((k) => '"' + k + '"').join(",")}) VALUES (${keys.map((_, i) => "$" + (i + 1)).join(",")}) ON CONFLICT DO NOTHING`,
        values,
      );
      count++;
    }
  }
  await client.query("COMMIT");
  console.log(`Imported ${count} workspace records; source was not modified.`);
} catch (error) {
  await client.query("ROLLBACK");
  console.error(error.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
