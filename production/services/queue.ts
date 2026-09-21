import { randomUUID } from "node:crypto";
import type { Database } from "./database";
import type { AIProvider, ProviderResult } from "../providers/types";
import { SubmissionUncertain } from "../providers/types";
import { refundGeneration } from "./generations";
export interface PrivateAssetStore {
  put(key: string, bytes: Uint8Array, mime: string): Promise<void>;
}
export type WorkerDependencies = {
  db: Database;
  provider: (name: string) => AIProvider;
  storage: PrivateAssetStore;
  allowedOutputHosts: ReadonlySet<string>;
};
/** Run repeatedly in a dedicated worker. PostgreSQL SKIP LOCKED is the durable queue; browser requests never wait for AI. */
export async function processOneJob(deps: WorkerDependencies) {
  const { db } = deps;
  const owner = randomUUID();
  const job = await db.transaction(async (tx) => {
    const j = (
      await tx.query(
        `SELECT * FROM generation_jobs WHERE state IN ('queued','polling') AND available_at<=now() AND (lease_until IS NULL OR lease_until<now()) ORDER BY available_at FOR UPDATE SKIP LOCKED LIMIT 1`,
      )
    ).rows[0];
    if (!j) return null;
    await tx.query(
      "UPDATE generation_jobs SET lease_owner=$2,lease_until=now()+interval '5 minutes',state=CASE WHEN state='queued' THEN 'submitting' ELSE 'polling' END,attempts=attempts+1 WHERE id=$1",
      [j.id, owner],
    );
    await tx.query(
      "UPDATE generations SET state='processing',updated_at=now() WHERE id=$1 AND state='queued'",
      [j.generation_id],
    );
    return j;
  });
  if (!job) return false;
  const g = (
    await db.query(
      `SELECT g.*,m.provider_model_id,m.generation_type,p.adapter,b.private_provider_parameters FROM generations g JOIN ai_models m ON m.id=g.model_id JOIN ai_providers p ON p.id=m.provider_id LEFT JOIN character_model_bindings b ON b.character_version_id=g.character_version_id AND b.model_id=g.model_id WHERE g.id=$1`,
      [job.generation_id],
    )
  ).rows[0];
  if (!g) throw new Error("Generation missing");
  const provider = deps.provider(g.adapter);
  let result: ProviderResult;
  try {
    if (g.provider_request_id)
      result = await provider.getStatus(g.provider_request_id);
    else {
      const input = {
        model: g.provider_model_id,
        prompt: g.prompt,
        parameters: { ...g.parameters, ...g.private_provider_parameters },
      };
      result =
        g.generation_type === "video"
          ? await provider.generateVideo(input)
          : g.generation_type === "text"
            ? await provider.generateText(input)
            : await provider.generateImage(input);
    }
  } catch (e) {
    if (e instanceof SubmissionUncertain || !g.provider_request_id) {
      await db.transaction(async (tx) => {
        await tx.query(
          "UPDATE generations SET state='reconciliation_required',error_code='submission_uncertain',updated_at=now() WHERE id=$1",
          [g.id],
        );
        await tx.query(
          "UPDATE generation_jobs SET state='reconciliation_required',lease_until=NULL WHERE id=$1 AND lease_owner=$2",
          [job.id, owner],
        );
      });
      return true;
    }
    await db.query(
      "UPDATE generation_jobs SET state='polling',available_at=now()+interval '30 seconds',lease_until=NULL WHERE id=$1 AND lease_owner=$2",
      [job.id, owner],
    );
    return true;
  }
  if (result.status === "failed" || result.status === "cancelled") {
    await db.transaction((tx) => refundGeneration(tx, g.id, "provider_failed"));
    return true;
  }
  if (result.status !== "completed") {
    if (!result.id) throw new Error("Queued provider result has no task ID");
    await db.transaction(async (tx) => {
      await tx.query(
        "UPDATE generations SET provider_request_id=$2,updated_at=now() WHERE id=$1",
        [g.id, result.id],
      );
      await tx.query(
        "UPDATE generation_jobs SET state='polling',submitted_at=coalesce(submitted_at,now()),lease_until=NULL,available_at=now()+interval '5 seconds' WHERE id=$1 AND lease_owner=$2",
        [job.id, owner],
      );
    });
    return true;
  }
  // Persist the provider task identity before asset copying. If copying fails, polling can retry without regeneration.
  if (result.id)
    await db.query(
      "UPDATE generations SET provider_request_id=$2 WHERE id=$1",
      [g.id, result.id],
    );
  try {
    const saved: { key: string; mime: string; size: number }[] = [];
    for (let i = 0; i < result.outputs.length; i++) {
      const o = result.outputs[i];
      let bytes: Uint8Array,
        mime = o.mime || "application/octet-stream";
      if (o.base64) {
        if (o.base64.length > 90_000_000) throw new Error("Output too large");
        bytes = Uint8Array.from(Buffer.from(o.base64, "base64"));
      } else if (o.url) {
        const url = new URL(o.url);
        if (
          url.protocol !== "https:" ||
          !deps.allowedOutputHosts.has(url.hostname) ||
          url.username ||
          url.password
        )
          throw new Error("Provider output host not allowed");
        const r = await fetch(url, {
          redirect: "error",
          signal: AbortSignal.timeout(30000),
        });
        if (!r.ok || Number(r.headers.get("content-length")) > 64 * 1024 * 1024)
          throw new Error("Output unavailable or too large");
        mime = (r.headers.get("content-type") || "").split(";")[0];
        const reader = r.body?.getReader();
        if (!reader) throw new Error("Empty output");
        const chunks: Uint8Array[] = [];
        let size = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 64 * 1024 * 1024) {
            await reader.cancel();
            throw new Error("Output too large");
          }
          chunks.push(value);
        }
        bytes = new Uint8Array(size);
        let offset = 0;
        for (const chunk of chunks) {
          bytes.set(chunk, offset);
          offset += chunk.length;
        }
      } else throw new Error("Missing output");
      if (
        ![
          "image/png",
          "image/jpeg",
          "image/webp",
          "video/mp4",
          "video/webm",
        ].includes(mime)
      )
        throw new Error("Unsupported media type");
      const key = `private/${g.user_id}/generations/${g.id}/${i}`;
      await deps.storage.put(key, bytes, mime);
      saved.push({ key, mime, size: bytes.length });
    }
    if (!saved.length) throw new Error("Provider returned no supported assets");
    await db.transaction(async (tx) => {
      const locked = (
        await tx.query("SELECT state FROM generations WHERE id=$1 FOR UPDATE", [
          g.id,
        ])
      ).rows[0];
      if (locked.state !== "processing") return;
      for (const a of saved)
        await tx.query(
          "INSERT INTO generation_assets(generation_id,user_id,storage_key,mime_type,size_bytes) VALUES($1,$2,$3,$4,$5) ON CONFLICT(storage_key) DO NOTHING",
          [g.id, g.user_id, a.key, a.mime, a.size],
        );
      await tx.query(
        "UPDATE generations SET state='completed',provider_cost_usd=$2,updated_at=now() WHERE id=$1",
        [g.id, result.costUsd ?? null],
      );
      await tx.query(
        "UPDATE generation_jobs SET state='completed',lease_until=NULL WHERE id=$1",
        [job.id],
      );
      await tx.query(
        "INSERT INTO notifications(user_id,type,payload) VALUES($1,'generation_completed',$2)",
        [g.user_id, JSON.stringify({ generationId: g.id })],
      );
    });
  } catch {
    await db.query(
      "UPDATE generation_jobs SET state=$2,available_at=now()+interval '30 seconds',lease_until=NULL WHERE id=$1 AND lease_owner=$3",
      [job.id, result.id ? "polling" : "reconciliation_required", owner],
    );
    if (!result.id)
      await db.query(
        "UPDATE generations SET state='reconciliation_required',error_code='asset_copy_failed',updated_at=now() WHERE id=$1",
        [g.id],
      );
  }
  return true;
}
/** A crashed submitter must never be blindly resubmitted; provider-side billing may have happened. */
export async function recoverExpiredSubmissions(db: Database) {
  return db.transaction(async (tx) => {
    const jobs = (
      await tx.query(
        "UPDATE generation_jobs SET state='reconciliation_required',lease_until=NULL WHERE state='submitting' AND lease_until<now() RETURNING generation_id",
      )
    ).rows;
    for (const j of jobs)
      await tx.query(
        "UPDATE generations SET state='reconciliation_required',error_code='worker_lost_during_submit',updated_at=now() WHERE id=$1",
        [j.generation_id],
      );
    return jobs.length;
  });
}
