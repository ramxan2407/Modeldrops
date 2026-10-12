import { dailyLimit, type GenerationEnvironment } from "./models";
import { demoEnabled, type DemoEnvironment } from "../credits";

function dollars(value: string | undefined, fallback: number) {
  const amount = Number(value ?? fallback);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10000)
    throw new Error("Invalid generation budget.");
  return Math.floor(amount * 1000000);
}
export function reserveProviderStatement(
  db: D1Database,
  env: GenerationEnvironment & DemoEnvironment,
  d: {
    id: string;
    userId: string;
    endpoint: string;
    input: string;
    reference: string | null;
    reserve: number;
  },
) {
  const rate = Number(env.GENERATION_REQUESTS_PER_MINUTE ?? 6);
  if (!Number.isSafeInteger(rate) || rate < 1 || rate > 1000)
    throw new Error("Invalid generation rate limit.");
  const now = new Date().toISOString(),
    day = now.slice(0, 10) + "T00:00:00.000Z";
  const outstanding = "p.state IN ('ready','submitting','uncertain','polling')";
  return db
    .prepare(
      `INSERT INTO provider_requests(generation_id,endpoint,input_json,character_reference,reserved_microusd,created_at,updated_at)
    SELECT ?,?,?,?,CASE WHEN
      COALESCE(SUM(CASE WHEN p.updated_at>=? OR ${outstanding} THEN p.reserved_microusd ELSE 0 END),0)+?<=?
      AND COALESCE(SUM(CASE WHEN g.user_id=? AND (p.updated_at>=? OR ${outstanding}) THEN p.reserved_microusd ELSE 0 END),0)+?<=?
      AND (?=0 OR COALESCE(SUM(CASE WHEN g.credit_wallet='demo' THEN p.reserved_microusd ELSE 0 END),0)+?<=?)
      AND (SELECT COUNT(*) FROM generations WHERE user_id=? AND status IN ('queued','processing'))<=3
      AND (SELECT COUNT(*) FROM generations WHERE user_id=? AND created_at>=?)<=?
      THEN CAST(? AS bigint) ELSE NULL END,?,?
    FROM provider_requests p JOIN generations g ON g.id=p.generation_id JOIN ai_models m ON m.id=g.model_id WHERE m.provider='WaveSpeed'`,
    )
    .bind(
      d.id,
      d.endpoint,
      d.input,
      d.reference,
      day,
      d.reserve,
      dailyLimit(env),
      d.userId,
      day,
      d.reserve,
      dollars(env.GENERATION_USER_DAILY_LIMIT_USD, 2),
      +demoEnabled(env),
      d.reserve,
      dollars(env.DEMO_TOTAL_LIMIT_USD, 25),
      d.userId,
      d.userId,
      new Date(Date.now() - 60000).toISOString(),
      rate,
      d.reserve,
      now,
      now,
    );
}
