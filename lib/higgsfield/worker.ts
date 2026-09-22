import { bindings } from "@/lib/server";
import { refundJob, runDemoJob } from "@/lib/demo-worker";
import { HiggsfieldClient, RejectedSubmission, downloadOutput } from "./client";
import { higgsfieldEnabled } from "./models";

export async function runGenerationJob(id: string, origin: string) {
  const env = bindings();
  const { DB, BUCKET } = env;
  const g = await DB.prepare(
    "SELECT g.*,m.provider FROM generations g JOIN ai_models m ON m.id=g.model_id WHERE g.id=?",
  )
    .bind(id)
    .first<any>();
  if (!g || !["queued", "processing"].includes(g.status)) return;
  if (g.provider === "Demo") return runDemoJob(id, origin);
  if (g.provider !== "Higgsfield" || !higgsfieldEnabled(env)) return;
  const now = new Date().toISOString();
  const claim = await DB.prepare(
    "UPDATE generation_jobs SET status='processing',lease_until=?,attempts=attempts+1 WHERE generation_id=? AND (status='queued' OR (status='processing' AND lease_until<?))",
  )
    .bind(new Date(Date.now() + 120000).toISOString(), id, now)
    .run();
  if (!claim.meta.changes) return;
  const provider = new HiggsfieldClient(env);
  let p = await DB.prepare(
    "SELECT * FROM provider_requests WHERE generation_id=?",
  )
    .bind(id)
    .first<any>();
  if (!p) return;
  try {
    await DB.prepare(
      "UPDATE generations SET status='processing',updated_at=? WHERE id=? AND status='queued'",
    )
      .bind(now, id)
      .run();
    if (["submitting", "uncertain"].includes(p.state) && !p.request_id) {
      await review(
        id,
        "Submission needs review. Credits remain reserved to prevent a duplicate charge.",
      );
      return;
    }
    if (p.state === "ready") {
      const account = await DB.prepare("SELECT suspended FROM users WHERE id=?")
        .bind(g.user_id)
        .first<{ suspended: number }>();
      const model = await DB.prepare("SELECT enabled FROM ai_models WHERE id=?")
        .bind(g.model_id)
        .first<{ enabled: number }>();
      if (!account || account.suspended || !model?.enabled) {
        await terminal(
          id,
          "failed",
          "Generation is unavailable. Credits returned.",
        );
        return;
      }
      await DB.prepare(
        "UPDATE provider_requests SET state='submitting',updated_at=? WHERE generation_id=? AND state='ready'",
      )
        .bind(now, id)
        .run();
      try {
        const submitted = await provider.submit(
          p.endpoint,
          JSON.parse(p.input_json),
        );
        await DB.prepare(
          "UPDATE provider_requests SET request_id=?,state='polling',updated_at=? WHERE generation_id=?",
        )
          .bind(submitted.request_id, new Date().toISOString(), id)
          .run();
        p = { ...p, request_id: submitted.request_id, state: "polling" };
      } catch (error) {
        if (error instanceof RejectedSubmission) {
          await terminal(
            id,
            "failed",
            "Higgsfield could not accept this request. Credits returned.",
          );
          return;
        }
        await review(
          id,
          "Submission needs review. Credits remain reserved to prevent a duplicate charge.",
        );
        return;
      }
      // Submission and delivery happen in separate invocations, inside function time limits.
      return;
    }
    if (!p.request_id) return;
    if (Date.now() - Date.parse(p.updated_at) > 24 * 3600000) {
      await review(
        id,
        "This job needs administrator review. Credits remain reserved while its outcome is checked.",
      );
      return;
    }
    const result = await provider.status(p.request_id);
    if (["failed", "nsfw", "canceled"].includes(result.status)) {
      await terminal(
        id,
        result.status === "canceled" ? "cancelled" : "failed",
        result.status === "nsfw"
          ? "The provider declined this content. Credits returned."
          : "Generation did not complete. Credits returned.",
      );
      return;
    }
    if (result.status !== "completed") return;
    const url =
      g.type === "video" ? result.video?.url : result.images?.[0]?.url;
    if (!url || (g.type === "image" && result.images?.length !== 1))
      throw new Error("Provider returned unexpected outputs.");
    const file = await downloadOutput(url, g.type, env);
    const storageKey = `private/${g.user_id}/generations/${id}.${file.extension}`;
    await BUCKET.put(storageKey, file.bytes, {
      httpMetadata: { contentType: file.mime },
    });
    await DB.batch([
      DB.prepare(
        "INSERT OR IGNORE INTO generation_assets(id,user_id,generation_id,storage_key,mime,size) VALUES(?,?,?,?,?,?)",
      ).bind(id, g.user_id, id, storageKey, file.mime, file.bytes.byteLength),
      DB.prepare(
        "UPDATE generations SET status='completed',asset_key=?,error=NULL,updated_at=? WHERE id=? AND status='processing'",
      ).bind(storageKey, new Date().toISOString(), id),
      DB.prepare(
        "UPDATE provider_requests SET state='completed',updated_at=? WHERE generation_id=?",
      ).bind(new Date().toISOString(), id),
      DB.prepare(
        "UPDATE generation_jobs SET status='completed',lease_until=NULL WHERE generation_id=?",
      ).bind(id),
      DB.prepare(
        "INSERT OR IGNORE INTO notifications(id,user_id,message) VALUES(?,?,?)",
      ).bind(
        `generation:${id}`,
        g.user_id,
        "Your creation is ready in My Generations.",
      ),
    ]);
  } catch {
    // Polling/storage errors never cause a fresh paid POST or a premature refund.
    await DB.prepare(
      "UPDATE generations SET error=?,updated_at=? WHERE id=? AND status='processing'",
    )
      .bind(
        "Checking provider status or saving your output. Your request will not be submitted again.",
        new Date().toISOString(),
        id,
      )
      .run();
    console.error("Higgsfield job requires retry", id);
  } finally {
    await DB.prepare(
      "UPDATE generation_jobs SET lease_until=? WHERE generation_id=? AND status='processing'",
    )
      .bind(new Date(Date.now() + 15000).toISOString(), id)
      .run();
  }
}

async function review(id: string, message: string) {
  const { DB } = bindings();
  await DB.batch([
    DB.prepare(
      "UPDATE provider_requests SET state='uncertain',updated_at=? WHERE generation_id=?",
    ).bind(new Date().toISOString(), id),
    DB.prepare(
      "UPDATE generation_jobs SET status='needs_review',lease_until=NULL WHERE generation_id=?",
    ).bind(id),
    DB.prepare(
      "UPDATE generations SET error=?,updated_at=? WHERE id=? AND status='processing'",
    ).bind(message, new Date().toISOString(), id),
  ]);
}
async function terminal(
  id: string,
  status: "failed" | "cancelled",
  message: string,
) {
  const { DB } = bindings();
  await refundJob(id, status, message);
  await DB.batch([
    DB.prepare(
      "UPDATE provider_requests SET state=?,reserved_microusd=0,updated_at=? WHERE generation_id=?",
    ).bind(status, new Date().toISOString(), id),
    DB.prepare("UPDATE generations SET error=? WHERE id=? AND status=?").bind(
      message,
      id,
      status,
    ),
  ]);
}
