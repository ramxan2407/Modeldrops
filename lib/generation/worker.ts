import { bindings } from "@/lib/server";
import { refundJob, runDemoJob } from "@/lib/demo-worker";
import { WaveSpeedClient, RejectedSubmission } from "./client";
import { downloadOutput } from "./media";
import { generationEnabled } from "./models";

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
  if (g.provider === "WaveSpeed" && !generationEnabled(env)) return;
  const now = new Date().toISOString();
  const claim = await DB.prepare(
    "UPDATE generation_jobs SET status='processing',lease_until=?,attempts=attempts+1 WHERE generation_id=? AND (status='queued' OR (status='processing' AND lease_until<?))",
  )
    .bind(new Date(Date.now() + 120000).toISOString(), id, now)
    .run();
  if (!claim.meta.changes) return;
  const provider = new WaveSpeedClient(env);
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
    // Retired jobs keep their identity. Never replay them through the new provider.
    if (g.provider !== "WaveSpeed") {
      if (p.state === "ready" && !p.request_id)
        await terminal(
          id,
          "cancelled",
          "This model was retired before submission. Credits returned.",
        );
      else
        await review(
          id,
          "This job belongs to a retired provider and requires administrator reconciliation. It will not be resubmitted.",
        );
      return;
    }
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
          .bind(submitted.id, new Date().toISOString(), id)
          .run();
        p = { ...p, request_id: submitted.id, state: "polling" };
      } catch (error) {
        if (error instanceof RejectedSubmission) {
          await terminal(
            id,
            "failed",
            `${error.userMessage} Credits returned.`,
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
    if (["failed", "cancelled"].includes(result.status)) {
      await terminal(
        id,
        result.status === "cancelled" ? "cancelled" : "failed",
        "Generation did not complete. Credits returned.",
      );
      return;
    }
    if (result.status !== "completed") return;
    const expected =
      g.type === "video" ? 1 : Number(JSON.parse(p.input_json).num_images || 1);
    const urls = result.outputs;
    const catalogImage =
      g.type === "image" && !!JSON.parse(g.settings).providerInputs;
    if (
      !urls ||
      !urls.length ||
      urls.length > 50 ||
      (!catalogImage && urls.length !== expected) ||
      urls.some((url) => !url)
    )
      throw new Error("Provider returned unexpected outputs.");
    // Save one output per invocation so a four-image batch stays within function limits.
    // Existing files survive retries, without repeating the paid submission.
    const saved = await DB.prepare(
      "SELECT id,storage_key FROM generation_assets WHERE generation_id=? AND user_id=?",
    )
      .bind(id, g.user_id)
      .all<{ id: string; storage_key: string }>();
    const assetIds = urls.map((_, index) =>
      index === 0 ? id : `${id}:${index}`,
    );
    const missing = assetIds.findIndex(
      (assetId) => !saved.results.some((asset) => asset.id === assetId),
    );
    if (missing !== -1) {
      const file = await downloadOutput(urls[missing]!, g.type, env);
      const key = `private/${g.user_id}/generations/${id}/${missing}.${file.extension}`;
      await BUCKET.put(key, file.bytes, {
        httpMetadata: { contentType: file.mime },
      });
      await DB.prepare(
        "INSERT OR IGNORE INTO generation_assets(id,user_id,generation_id,storage_key,mime,size) VALUES(?,?,?,?,?,?)",
      )
        .bind(
          assetIds[missing],
          g.user_id,
          id,
          key,
          file.mime,
          file.bytes.byteLength,
        )
        .run();
      saved.results.push({ id: assetIds[missing], storage_key: key });
    }
    if (
      !assetIds.every((assetId) =>
        saved.results.some((asset) => asset.id === assetId),
      )
    )
      return;
    const storageKey = saved.results.find(
      (asset) => asset.id === id,
    )!.storage_key;
    await DB.batch([
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
    console.error("Generation job requires retry", id);
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
