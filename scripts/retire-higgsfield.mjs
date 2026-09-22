/** Preserve historical records; retire models only when no generation can be stranded. */
import { Pool } from "pg";
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
  const pending = await client.query(
    "SELECT count(*)::int AS count FROM model_drops.generations g JOIN model_drops.ai_models m ON m.id=g.model_id WHERE m.provider='Higgsfield' AND g.status IN ('queued','processing')",
  );
  if (pending.rows[0].count)
    throw new Error(
      "Higgsfield jobs still need completion or reconciliation. Retirement aborted; no records changed.",
    );
  const updated = await client.query(
    "UPDATE model_drops.ai_models SET enabled=0 WHERE provider='Higgsfield' AND enabled<>0",
  );
  await client.query("COMMIT");
  console.log(
    `Retired ${updated.rowCount} old models. Historical generations, assets and credits preserved.`,
  );
} catch (error) {
  await client.query("ROLLBACK");
  console.error(error.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
