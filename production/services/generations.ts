import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import type { Database, Sql } from "./database";
import { priceForMargin } from "../../lib/pricing";
const requestSchema = z
  .object({
    modelId: z.string().uuid(),
    characterId: z.string().uuid().nullable(),
    prompt: z.string().trim().min(1).max(4000),
    parameters: z.record(
      z.union([
        z.string().max(2000),
        z.number().finite(),
        z.boolean(),
        z.null(),
      ]),
    ),
    idempotencyKey: z.string().uuid(),
  })
  .strict();
/** User ID must come from a verified session. This service is not itself an authentication boundary. */
export async function enqueueGeneration(
  db: Database,
  userId: string,
  input: unknown,
) {
  const req = requestSchema.parse(input);
  const requestHash = createHash("sha256")
    .update(JSON.stringify(req))
    .digest("hex");
  return db.transaction(async (tx) => {
    await tx.query(
      "SELECT user_id FROM credit_wallets WHERE user_id=$1 FOR UPDATE",
      [userId],
    ); // Serialize per-wallet price reservations and retries.
    const key = `generation:${userId}:${req.idempotencyKey}`;
    const existing = (
      await tx.query(
        "SELECT id,request_hash,credit_cost,state FROM generations WHERE idempotency_key=$1",
        [key],
      )
    ).rows[0];
    if (existing) {
      if (existing.request_hash !== requestHash)
        throw new Error("Idempotency key reused with different input");
      return existing;
    }
    const m = (
      await tx.query(
        `SELECT m.*,p.id AS pricing_id,p.provider_cost_usd,p.fixed_credits,p.target_gross_margin,p.credit_value_usd,p.minimum_credits,p.multipliers,p.version AS pricing_version FROM ai_models m JOIN ai_providers a ON a.id=m.provider_id JOIN LATERAL(SELECT * FROM model_pricing WHERE model_id=m.id AND effective_at<=now() ORDER BY effective_at DESC,version DESC LIMIT 1) p ON true WHERE m.id=$1 AND m.enabled AND a.enabled`,
        [req.modelId],
      )
    ).rows[0];
    if (!m) throw new Error("Model unavailable");
    validateParameters(req.parameters, m.parameters_schema);
    let characterVersionId = null,
      purchaseId = null;
    if (req.characterId) {
      const access = (
        await tx.query(
          `SELECT v.id AS version_id,p.id AS purchase_id FROM characters c JOIN character_purchases p ON p.character_id=c.id JOIN character_versions v ON v.character_id=c.id JOIN character_model_bindings b ON b.character_version_id=v.id WHERE c.id=$1 AND c.status='approved' AND c.deleted_at IS NULL AND (NOT c.depicts_real_person OR EXISTS(SELECT 1 FROM moderation_cases mc WHERE mc.id=c.consent_review_id AND mc.status='closed' AND mc.decision='consent_verified')) AND p.buyer_id=$2 AND p.status='active' AND v.status='active' AND b.model_id=$3 AND b.enabled ORDER BY v.version DESC LIMIT 1`,
          [req.characterId, userId, req.modelId],
        )
      ).rows[0];
      if (!access)
        throw new Error(
          "Character access, license, consent, or model compatibility invalid",
        );
      characterVersionId = access.version_id;
      purchaseId = access.purchase_id;
    }
    const multiplier = calculateMultiplier(req.parameters, m.multipliers);
    const cost = m.fixed_credits
      ? Math.max(
          Number(m.minimum_credits),
          Math.ceil(Number(m.fixed_credits) * multiplier),
        )
      : priceForMargin(
          Number(m.provider_cost_usd) * multiplier,
          Number(m.target_gross_margin),
          Number(m.credit_value_usd),
          Number(m.minimum_credits),
        );
    if (!Number.isSafeInteger(cost) || cost < 1)
      throw new Error("Invalid pricing rule");
    const id = randomUUID();
    await tx.query(
      `INSERT INTO generations(id,user_id,model_id,character_version_id,purchase_id,prompt,parameters,pricing_snapshot,credit_cost,idempotency_key,request_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        id,
        userId,
        req.modelId,
        characterVersionId,
        purchaseId,
        req.prompt,
        JSON.stringify(req.parameters),
        JSON.stringify({
          version: m.pricing_version,
          providerCostUsd: m.provider_cost_usd,
          multiplier,
          credits: cost,
        }),
        cost,
        key,
        requestHash,
      ],
    );
    await tx.query(
      "SELECT post_credit_entry($1,$2,'generation_charge',$3,$4,$5)",
      [userId, -cost, "Generation reservation", `charge:${id}`, id],
    );
    await tx.query("INSERT INTO generation_jobs(generation_id) VALUES($1)", [
      id,
    ]);
    return { id, state: "queued", credit_cost: cost };
  });
}
export function validateParameters(
  parameters: Record<string, unknown>,
  schema: any,
) {
  if (!schema || schema.type !== "object" || !schema.properties)
    throw new Error("Model input schema is not configured");
  for (const field of schema.required || [])
    if (parameters[field] === undefined)
      throw new Error(`Missing parameter: ${field}`);
  for (const [key, value] of Object.entries(parameters)) {
    const rule = schema.properties[key];
    if (!rule) throw new Error(`Unsupported parameter: ${key}`);
    if (rule.enum && !rule.enum.includes(value))
      throw new Error(`Unsupported value for ${key}`);
    if (rule.type === "integer" && !Number.isSafeInteger(value))
      throw new Error(`${key} must be an integer`);
    if (
      rule.type === "number" &&
      (typeof value !== "number" || !Number.isFinite(value))
    )
      throw new Error(`${key} must be a finite number`);
    if (
      rule.type === "string" &&
      (typeof value !== "string" || value.length > (rule.maxLength ?? 2000))
    )
      throw new Error(`${key} must be a supported string`);
    if (rule.type === "boolean" && typeof value !== "boolean")
      throw new Error(`${key} must be boolean`);
    if (
      typeof value === "number" &&
      ((rule.minimum !== undefined && value < rule.minimum) ||
        (rule.maximum !== undefined && value > rule.maximum))
    )
      throw new Error(`${key} is out of range`);
  }
}
export function calculateMultiplier(
  parameters: Record<string, unknown>,
  rules: Record<string, Record<string, number>>,
) {
  let m = 1;
  for (const [key, values] of Object.entries(rules)) {
    const factor = values[String(parameters[key])];
    if (typeof factor !== "number" || !Number.isFinite(factor) || factor <= 0)
      throw new Error(`Missing price for ${key}`);
    m *= factor;
  }
  return m;
}
export async function refundGeneration(tx: Sql, id: string, reason: string) {
  const g = (
    await tx.query("SELECT * FROM generations WHERE id=$1 FOR UPDATE", [id])
  ).rows[0];
  if (!g || ["completed", "refunded"].includes(g.state)) return;
  await tx.query(
    "SELECT post_credit_entry($1,$2,'generation_refund',$3,$4,$5)",
    [g.user_id, g.credit_cost, reason, `refund:${id}`, id],
  );
  await tx.query(
    "UPDATE generations SET state='refunded',error_code=$2,updated_at=now() WHERE id=$1",
    [id, reason],
  );
  await tx.query(
    "UPDATE generation_jobs SET state='refunded',lease_until=NULL WHERE generation_id=$1",
    [id],
  );
}
