import { z } from "zod";
import { ApiError, type bindings } from "../server";
import { roleFor } from "../admin/policy";
import { generationProvider } from "./provider";

const input = z.object({
  id: z.string().uuid(),
  key: z.string().uuid(),
  expectedUpdatedAt: z.string(),
  action: z.enum(["resume", "refund"]),
  requestId: z.string().trim().max(200).optional(),
  reason: z.string().trim().min(10).max(1000),
  confirmed: z.literal(true),
});
/** Operator reconciliation never calls submit, even when the original outcome is unknown. */
export async function reconcileGeneration(
  env: ReturnType<typeof bindings>,
  actor: string,
  raw: unknown,
) {
  if (roleFor(env, actor) !== "super_admin")
    throw new ApiError(403, "Super administrator access required.");
  const parsed = input.safeParse(raw);
  if (!parsed.success)
    throw new ApiError(
      400,
      "Provide valid recovery details and confirm the provider review.",
    );
  const d = parsed.data,
    db = env.DB,
    auditId = `reconcile:${d.key}`,
    metadata = JSON.stringify(d);
  const previous = await db
    .prepare("SELECT actor_id,metadata FROM audit_logs WHERE id=?")
    .bind(auditId)
    .first<{ actor_id: string; metadata: string }>();
  if (previous) {
    if (previous.actor_id !== actor || previous.metadata !== metadata)
      throw new ApiError(409, "This operation key was already used.");
    return { ok: true };
  }
  const job = await db
    .prepare(
      "SELECT g.user_id,g.cost,g.credit_wallet,m.provider,p.request_id,p.updated_at FROM generations g JOIN ai_models m ON m.id=g.model_id JOIN provider_requests p ON p.generation_id=g.id JOIN generation_jobs j ON j.generation_id=g.id WHERE g.id=? AND j.status='needs_review' AND g.status='processing'",
    )
    .bind(d.id)
    .first<{
      user_id: string;
      cost: number;
      credit_wallet: string;
      provider: string;
      request_id: string | null;
      updated_at: string;
    }>();
  if (!job || job.updated_at !== d.expectedUpdatedAt)
    throw new ApiError(409, "This job changed. Refresh before reviewing it.");
  const requestId = job.request_id || d.requestId;
  if (d.action === "resume") {
    if (
      !requestId ||
      (job.request_id && d.requestId && d.requestId !== job.request_id)
    )
      throw new ApiError(
        400,
        "Use the saved request ID, or the recovered ID verified in the provider console.",
      );
    const other = await db
      .prepare(
        "SELECT generation_id FROM provider_requests WHERE request_id=? AND generation_id<>?",
      )
      .bind(requestId, d.id)
      .first();
    if (other)
      throw new ApiError(
        409,
        "That provider request belongs to another generation.",
      );
    const status = await generationProvider(job.provider, env).status(
      requestId,
    );
    if (["failed", "cancelled"].includes(status.status))
      throw new ApiError(
        409,
        "Provider reports a terminal failure. Close and refund this job instead.",
      );
  }
  const now = new Date().toISOString();
  const guard = "EXISTS(SELECT 1 FROM audit_logs WHERE id=?)";
  const statements = [
    db
      .prepare(
        "INSERT INTO audit_logs(id,actor_id,action,entity_id,metadata) SELECT ?,?,'generation.reconcile',?,? WHERE EXISTS(SELECT 1 FROM generation_jobs j JOIN provider_requests p ON p.generation_id=j.generation_id WHERE j.generation_id=? AND j.status='needs_review' AND p.updated_at=?)",
      )
      .bind(auditId, actor, d.id, metadata, d.id, d.expectedUpdatedAt),
  ];
  if (d.action === "resume")
    statements.push(
      db
        .prepare(
          `UPDATE provider_requests SET request_id=?,state='polling',updated_at=? WHERE generation_id=? AND ${guard}`,
        )
        .bind(requestId!, now, d.id, auditId),
      db
        .prepare(
          `UPDATE generation_jobs SET status='queued',lease_until=NULL WHERE generation_id=? AND ${guard}`,
        )
        .bind(d.id, auditId),
      db
        .prepare(
          `UPDATE generations SET error=NULL,updated_at=? WHERE id=? AND ${guard}`,
        )
        .bind(now, d.id, auditId),
    );
  else
    statements.push(
      db
        .prepare(
          `UPDATE generations SET status='failed',error='Administrator closed this request. Credits returned.',updated_at=? WHERE id=? AND ${guard}`,
        )
        .bind(now, d.id, auditId),
      db
        .prepare(
          `INSERT OR IGNORE INTO credit_transactions(id,user_id,amount,type,generation_id,description,balance_before,balance_after,idempotency_key,wallet) SELECT ?,?,?,'generation_refund',?,'Administrator reviewed generation refund',COALESCE(SUM(amount),0),COALESCE(SUM(amount),0)+?,?,? FROM credit_transactions WHERE user_id=? AND wallet=? HAVING ${guard}`,
        )
        .bind(
          crypto.randomUUID(),
          job.user_id,
          job.cost,
          d.id,
          job.cost,
          `refund:${d.id}`,
          job.credit_wallet,
          job.user_id,
          job.credit_wallet,
          auditId,
        ),
      db
        .prepare(
          `UPDATE generation_jobs SET status='failed',lease_until=NULL WHERE generation_id=? AND ${guard}`,
        )
        .bind(d.id, auditId),
      // A customer refund does not prove that the provider did not charge us.
      db
        .prepare(
          `UPDATE provider_requests SET state='admin_refunded',updated_at=? WHERE generation_id=? AND ${guard}`,
        )
        .bind(now, d.id, auditId),
    );
  const results = await db.batch(statements);
  if (!results[0].meta.changes) {
    const replay = await db
      .prepare("SELECT actor_id,metadata FROM audit_logs WHERE id=?")
      .bind(auditId)
      .first<{ actor_id: string; metadata: string }>();
    if (!replay || replay.actor_id !== actor || replay.metadata !== metadata)
      throw new ApiError(
        409,
        "Another administrator already reviewed this job.",
      );
  }
  return { ok: true };
}
