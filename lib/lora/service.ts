import { administratorIds } from "../admin/policy";
import { z } from "zod";
import {
  LoraError,
  MIN_IMAGES,
  MAX_IMAGES,
  MAX_LORA_SIZE,
  PART_SIZE,
  characterTypes,
  statusLabels,
  transitionAllowed,
  imageMime,
  validateSafetensors,
  type TrainingRequest,
  type TrainingFile,
  type TrainedLora,
  type TrainingStatus,
} from "./types";
export type LoraBindings = {
  DB: D1Database;
  BUCKET: R2Bucket;
  ADMIN_USER_IDS?: string;
  SUPER_ADMIN_USER_IDS?: string;
  LORA_ADMIN_EMAILS?: string;
  RESEND_API_KEY?: string;
  LORA_EMAIL_FROM?: string;
  APP_ORIGIN?: string;
};
export type LoraUser = {
  userId: string;
  email: string;
  fullName?: string | null;
};
const now = () => new Date().toISOString();
const id = () => crypto.randomUUID();
const required = z.string().trim().min(1).max(120);
const long = z.string().trim().max(4000).default("");
const draftSchema = z.object({
  characterName: required,
  characterDescription: long,
  characterType: z.enum(characterTypes),
  triggerWord: z.string().trim().max(100).default(""),
  notes: long,
  instructions: long,
  referencePrompt: long,
});
const deliverySchema = z.object({
  fileId: z.string().uuid(),
  coverId: z.string().uuid(),
  triggerWord: required,
  version: z.string().trim().min(1).max(40),
  recommendedPrompt: z.string().trim().min(1).max(4000),
  description: long,
});
function parse<T>(schema: z.ZodType<T>, data: unknown): T {
  const r = schema.safeParse(data);
  if (!r.success)
    throw new LoraError(
      400,
      r.error.issues.map((x) => `${x.path.join(".")}: ${x.message}`).join("; "),
    );
  return r.data;
}
export class LoraService {
  constructor(
    public env: LoraBindings,
    public user: LoraUser,
  ) {}
  get db() {
    return this.env.DB;
  }
  get admin() {
    return administratorIds(this.env).includes(this.user.userId);
  }
  requireAdmin() {
    if (!this.admin) throw new LoraError(403, "Administrator access required.");
  }
  async settings() {
    return {
      maxImageMb:
        (
          await this.db
            .prepare(
              "SELECT max_image_mb FROM training_settings WHERE id='default'",
            )
            .first<{ max_image_mb: number }>()
        )?.max_image_mb ?? 10,
    };
  }
  async request(requestId: string, ownerOnly = false) {
    const r = await this.db
      .prepare("SELECT * FROM training_requests WHERE id=?")
      .bind(requestId)
      .first<TrainingRequest>();
    if (!r || (r.user_id !== this.user.userId && (ownerOnly || !this.admin)))
      throw new LoraError(404, "Training request not found.");
    return r;
  }
  async state(adminView = false) {
    if (adminView) this.requireAdmin();
    const requests = await this.db
      .prepare(
        `SELECT * FROM training_requests WHERE ${adminView ? "status<>'draft'" : "user_id=?"} ORDER BY created_at DESC LIMIT 500`,
      )
      .bind(...(adminView ? [] : [this.user.userId]))
      .all<TrainingRequest>();
    const loras = await this.db
      .prepare(
        `SELECT * FROM trained_loras WHERE deleted_at IS NULL ${adminView ? "" : "AND user_id=?"} ORDER BY created_at DESC LIMIT 500`,
      )
      .bind(...(adminView ? [] : [this.user.userId]))
      .all<TrainedLora>();
    const email = adminView
      ? await this.db
          .prepare(
            "SELECT SUM(CASE WHEN status IN ('pending','sending') THEN 1 ELSE 0 END) pending,SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) failed FROM training_emails",
          )
          .first<{ pending: number; failed: number }>()
      : null;
    return {
      requests: requests.results,
      loras: loras.results,
      ...(await this.settings()),
      ...(adminView
        ? {
            email: {
              configured: !!(
                this.env.RESEND_API_KEY && this.env.LORA_EMAIL_FROM
              ),
              pending: email?.pending || 0,
              failed: email?.failed || 0,
            },
          }
        : {}),
    };
  }
  async detail(requestId: string) {
    const request = await this.request(requestId);
    const [files, events, lora] = await Promise.all([
      this.db
        .prepare(
          "SELECT id,request_id,kind,name,mime,size,ready FROM training_files WHERE request_id=? ORDER BY created_at",
        )
        .bind(requestId)
        .all(),
      this.db
        .prepare(
          "SELECT id,status,message,created_at FROM training_events WHERE request_id=? ORDER BY created_at,id",
        )
        .bind(requestId)
        .all(),
      this.db
        .prepare(
          "SELECT * FROM trained_loras WHERE request_id=? AND deleted_at IS NULL",
        )
        .bind(requestId)
        .first(),
    ]);
    return {
      request,
      files: files.results.filter((f) => this.admin || f.kind === "dataset"),
      events: events.results,
      lora,
    };
  }
  async createDraft(data: unknown) {
    const d = parse(draftSchema, data),
      requestId = id();
    const count = await this.db
      .prepare(
        "SELECT COUNT(*) n FROM training_requests WHERE user_id=? AND status NOT IN ('completed','rejected')",
      )
      .bind(this.user.userId)
      .first<{ n: number }>();
    if ((count?.n || 0) >= 20)
      throw new LoraError(
        429,
        "You can have up to 20 active requests. Remove unused drafts or wait for an active request to finish.",
      );
    const inserted = await this.db
      .prepare(
        "INSERT INTO training_requests(id,user_id,user_email,user_name,character_name,character_description,character_type,trigger_word,notes,instructions,reference_prompt,dataset_path,updated_at) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM training_requests WHERE user_id=? AND status NOT IN ('completed','rejected'))<20",
      )
      .bind(
        requestId,
        this.user.userId,
        this.user.email,
        this.user.fullName || "Creator",
        d.characterName,
        d.characterDescription,
        d.characterType,
        d.triggerWord,
        d.notes,
        d.instructions,
        d.referencePrompt,
        `datasets/${this.user.userId}/${requestId}/images`,
        now(),
        this.user.userId,
      )
      .run();
    if (!inserted.meta.changes)
      throw new LoraError(429, "Active request limit reached.");
    return { id: requestId };
  }
  async updateDraft(requestId: string, data: unknown) {
    await this.request(requestId, true);
    const d = parse(draftSchema, data);
    const r = await this.db
      .prepare(
        "UPDATE training_requests SET character_name=?,character_description=?,character_type=?,trigger_word=?,notes=?,instructions=?,reference_prompt=?,updated_at=?,revision=revision+1 WHERE id=? AND status='draft'",
      )
      .bind(
        d.characterName,
        d.characterDescription,
        d.characterType,
        d.triggerWord,
        d.notes,
        d.instructions,
        d.referencePrompt,
        now(),
        requestId,
      )
      .run();
    if (!r.meta.changes)
      throw new LoraError(409, "This request has already been submitted.");
    return { ok: true };
  }
  async uploadImage(
    requestId: string,
    kind: "dataset" | "cover",
    name: string,
    bytes: Uint8Array,
  ) {
    const r = await this.request(requestId, kind === "dataset");
    if (kind === "cover") this.requireAdmin();
    const expected = kind === "dataset" ? "draft" : "quality_check";
    if (r.status !== expected)
      throw new LoraError(
        409,
        kind === "dataset"
          ? "Submitted datasets cannot be changed."
          : "Move the request to Quality Check before uploading delivery files.",
      );
    const { maxImageMb } = await this.settings();
    if (!bytes.length || bytes.length > maxImageMb * 1024 * 1024)
      throw new LoraError(413, `Each image must be under ${maxImageMb} MB.`);
    const mime = imageMime(bytes);
    if (!/\.(jpe?g|png|webp)$/i.test(name))
      throw new LoraError(400, "Use JPG, PNG, or WEBP filenames.");
    const fileId = id(),
      key =
        kind === "dataset"
          ? `datasets/${r.user_id}/${r.id}/images/${fileId}`
          : `loras/${r.user_id}/${r.id}/${fileId}`;
    await this.env.BUCKET.put(key, bytes, {
      httpMetadata: { contentType: mime },
    });
    try {
      const insert = this.db
        .prepare(
          "INSERT INTO training_files(id,request_id,kind,name,storage_key,mime,size,ready) SELECT ?,?,?,?,?,?,?,1 WHERE EXISTS(SELECT 1 FROM training_requests WHERE id=? AND status=?) AND (SELECT COUNT(*) FROM training_files WHERE request_id=? AND kind=?)<?",
        )
        .bind(
          fileId,
          r.id,
          kind,
          name.slice(0, 200),
          key,
          mime,
          bytes.length,
          r.id,
          expected,
          r.id,
          kind,
          kind === "dataset" ? MAX_IMAGES : 10,
        );
      const result = await this.db.batch([
        insert,
        this.db
          .prepare(
            "UPDATE training_requests SET revision=revision+1 WHERE id=? AND status='draft' AND EXISTS(SELECT 1 FROM training_files WHERE id=?)",
          )
          .bind(r.id, fileId),
      ]);
      if (!result[0].meta.changes)
        throw new LoraError(
          409,
          "The request changed or the upload limit was reached.",
        );
    } catch (e) {
      await this.env.BUCKET.delete(key);
      throw e;
    }
    return { id: fileId };
  }
  async removeFile(fileId: string) {
    const f = await this.db
      .prepare("SELECT * FROM training_files WHERE id=?")
      .bind(fileId)
      .first<TrainingFile>();
    if (!f) throw new LoraError(404, "File not found.");
    const r = await this.request(f.request_id, f.kind === "dataset");
    if (f.kind !== "dataset") this.requireAdmin();
    const expected = f.kind === "dataset" ? "draft" : "quality_check";
    if (r.status !== expected)
      throw new LoraError(409, "Files are locked for this request.");
    const result = await this.db.batch([
      this.db
        .prepare(
          "UPDATE training_requests SET revision=revision+1 WHERE id=? AND status='draft' AND EXISTS(SELECT 1 FROM training_files WHERE id=?)",
        )
        .bind(r.id, fileId),
      this.db
        .prepare(
          "DELETE FROM training_files WHERE id=? AND EXISTS(SELECT 1 FROM training_requests WHERE id=? AND status=?)",
        )
        .bind(fileId, r.id, expected),
    ]);
    if (result[1].meta.changes) {
      if (f.upload_id && !f.ready)
        await this.env.BUCKET.resumeMultipartUpload(
          f.storage_key,
          f.upload_id,
        ).abort();
      await this.env.BUCKET.delete(f.storage_key);
    }
    return { ok: true };
  }
  async deleteDraft(requestId: string) {
    const r = await this.request(requestId, true);
    if (r.status !== "draft")
      throw new LoraError(409, "Only drafts can be discarded.");
    const files = await this.db
      .prepare("SELECT storage_key FROM training_files WHERE request_id=?")
      .bind(requestId)
      .all<{ storage_key: string }>();
    const result = await this.db.batch([
      this.db
        .prepare(
          "DELETE FROM training_files WHERE request_id=? AND EXISTS(SELECT 1 FROM training_requests WHERE id=? AND status='draft' AND revision=?)",
        )
        .bind(requestId, requestId, r.revision),
      this.db
        .prepare(
          "DELETE FROM training_requests WHERE id=? AND status='draft' AND revision=?",
        )
        .bind(requestId, r.revision),
    ]);
    if (!result[1].meta.changes)
      throw new LoraError(
        409,
        "This draft changed. Refresh before discarding it.",
      );
    if (files.results.length)
      await this.env.BUCKET.delete(files.results.map((f) => f.storage_key));
    return { ok: true };
  }
  async notificationStatements(
    r: TrainingRequest,
    eventId: string,
    status: TrainingStatus,
    message: string,
  ) {
    const statements = [
      this.db
        .prepare(
          "INSERT INTO training_events(id,request_id,status,message,actor_id) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM training_requests WHERE id=? AND event_id=?)",
        )
        .bind(eventId, r.id, status, message, this.user.userId, r.id, eventId),
    ];
    const recipients = [{ id: r.user_id, email: r.user_email, message }];
    if (status === "pending") {
      const admins = administratorIds(this.env);
      if (admins.length) {
        const found = await this.db
          .prepare(
            `SELECT id,email FROM users WHERE id IN (${admins.map(() => "?").join(",")})`,
          )
          .bind(...admins)
          .all<{ id: string; email: string }>();
        recipients.push(
          ...found.results.map((a) => ({
            ...a,
            message: `New training request: ${r.character_name} · ${r.user_name} (${r.user_email}) · ${r.image_count} images · ${(r.dataset_size / 1048576).toFixed(1)} MB · ${r.id} · ${now()}`,
          })),
        );
      }
    }
    const emails = new Map<string, string>();
    for (const recipient of recipients) {
      statements.push(
        this.db
          .prepare(
            "INSERT INTO notifications(id,user_id,message) SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM training_events WHERE id=?)",
          )
          .bind(id(), recipient.id, recipient.message, eventId),
      );
      emails.set(recipient.email, recipient.message);
    }
    if (status === "pending")
      for (const email of (this.env.LORA_ADMIN_EMAILS || "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean))
        emails.set(
          email,
          `New training request\nUser: ${r.user_name}\nEmail: ${r.user_email}\nRequest: ${r.id}\nCharacter: ${r.character_name}\nDataset: ${r.image_count} images / ${r.dataset_size} bytes\nSubmitted: ${now()}`,
        );
    for (const [email, body] of emails)
      statements.push(
        this.db
          .prepare(
            "INSERT INTO training_emails(id,event_id,recipient,subject,body) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM training_events WHERE id=?)",
          )
          .bind(
            id(),
            eventId,
            email,
            `Model Drops · ${r.character_name} · ${statusLabels[status]}`,
            `${body}\n\nRequest ID: ${r.id}\n${this.env.APP_ORIGIN ? this.env.APP_ORIGIN.replace(/\/$/, "") + "/my-loras" : "Open My LoRAs in Model Drops to view details."}`,
            eventId,
          ),
      );
    statements.push(
      this.db
        .prepare(
          "INSERT INTO audit_logs(id,actor_id,action,entity_id,metadata) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM training_events WHERE id=?)",
        )
        .bind(
          id(),
          this.user.userId,
          "lora." + status,
          r.id,
          JSON.stringify({ eventId }),
          eventId,
        ),
    );
    return statements;
  }
  async submit(requestId: string) {
    const r = await this.request(requestId, true);
    if (r.status !== "draft") return { id: r.id, status: r.status };
    const files = await this.db
      .prepare(
        "SELECT * FROM training_files WHERE request_id=? AND kind='dataset' AND ready=1",
      )
      .bind(r.id)
      .all<TrainingFile>();
    if (files.results.length < MIN_IMAGES)
      throw new LoraError(
        400,
        `Upload at least ${MIN_IMAGES} images before submitting.`,
      );
    for (const f of files.results) {
      if (!(await this.env.BUCKET.head(f.storage_key)))
        throw new LoraError(
          409,
          "An uploaded image is missing. Remove it and upload again.",
        );
    }
    const eventId = id();
    r.image_count = files.results.length;
    r.dataset_size = files.results.reduce((s, f) => s + f.size, 0);
    const result = await this.db.batch([
      this.db
        .prepare(
          "UPDATE training_requests SET status='pending',image_count=?,dataset_size=?,submitted_at=?,updated_at=?,event_id=?,revision=revision+1 WHERE id=? AND status='draft' AND revision=? AND (SELECT COUNT(*) FROM training_files WHERE request_id=? AND kind='dataset' AND ready=1)=?",
        )
        .bind(
          r.image_count,
          r.dataset_size,
          now(),
          now(),
          eventId,
          r.id,
          r.revision,
          r.id,
          r.image_count,
        ),
      ...(await this.notificationStatements(
        r,
        eventId,
        "pending",
        `${r.character_name}: training request submitted. Your dataset is pending review.`,
      )),
    ]);
    if (!result[0].meta.changes)
      throw new LoraError(
        409,
        "The dataset changed. Refresh and submit again.",
      );
    return { id: r.id, status: "pending" };
  }
  async transition(
    requestId: string,
    revision: number,
    status: TrainingStatus,
    reason = "",
    delivery?: unknown,
  ) {
    this.requireAdmin();
    const r = await this.request(requestId);
    if (!transitionAllowed(r.status, status))
      throw new LoraError(
        409,
        "This status change is not available. Refresh the request.",
      );
    if (r.revision !== revision)
      throw new LoraError(
        409,
        "Another administrator updated this request. Refresh to continue.",
      );
    if (status === "rejected" && (!reason.trim() || reason.length > 2000))
      throw new LoraError(
        400,
        "Add a rejection reason (up to 2,000 characters).",
      );
    const eventId = id(),
      d = status === "completed" ? parse(deliverySchema, delivery) : null;
    if (d) {
      for (const [fileId, kind] of [
        [d.fileId, "weights"],
        [d.coverId, "cover"],
      ]) {
        const f = await this.db
          .prepare(
            "SELECT * FROM training_files WHERE id=? AND request_id=? AND kind=? AND ready=1",
          )
          .bind(fileId, r.id, kind)
          .first<TrainingFile>();
        if (!f || !(await this.env.BUCKET.head(f.storage_key)))
          throw new LoraError(
            400,
            `Upload a complete ${kind === "weights" ? ".safetensors file" : "cover image"} first.`,
          );
      }
    }
    const statements = [
      this.db
        .prepare(
          "UPDATE training_requests SET status=?,rejection_reason=?,event_id=?,revision=revision+1,updated_at=? WHERE id=? AND revision=? AND status=?",
        )
        .bind(
          status,
          status === "rejected" ? reason.trim() : null,
          eventId,
          now(),
          r.id,
          revision,
          r.status,
        ),
    ];
    if (d)
      statements.push(
        this.db
          .prepare(
            "INSERT INTO trained_loras(id,user_id,request_id,name,cover_id,file_id,trigger_word,recommended_prompt,version,description) SELECT ?,?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM training_requests WHERE id=? AND event_id=?)",
          )
          .bind(
            id(),
            r.user_id,
            r.id,
            r.character_name,
            d.coverId,
            d.fileId,
            d.triggerWord,
            d.recommendedPrompt,
            d.version,
            d.description,
            r.id,
            eventId,
          ),
      );
    statements.push(
      ...(await this.notificationStatements(
        r,
        eventId,
        status,
        `${r.character_name}: ${statusLabels[status]}.${status === "rejected" ? " " + reason.trim() : status === "completed" ? " Your LoRA is ready to download in My LoRAs." : ""}`,
      )),
    );
    const result = await this.db.batch(statements);
    if (!result[0].meta.changes)
      throw new LoraError(
        409,
        "Another administrator updated this request. Refresh to continue.",
      );
    return { ok: true };
  }
  async startWeights(requestId: string, name: string, size: number) {
    this.requireAdmin();
    const r = await this.request(requestId);
    if (r.status !== "quality_check")
      throw new LoraError(
        409,
        "Delivery uploads are available during Quality Check.",
      );
    if (
      !name.toLowerCase().endsWith(".safetensors") ||
      !Number.isSafeInteger(size) ||
      size < 10 ||
      size > MAX_LORA_SIZE
    )
      throw new LoraError(400, "Use a .safetensors file up to 2 GB.");
    const count = await this.db
      .prepare(
        "SELECT COUNT(*) n FROM training_files WHERE request_id=? AND kind='weights'",
      )
      .bind(r.id)
      .first<{ n: number }>();
    if ((count?.n || 0) >= 5)
      throw new LoraError(
        400,
        "Remove an earlier delivery upload before adding another.",
      );
    const fileId = id(),
      key = `loras/${r.user_id}/${r.id}/${fileId}.safetensors`;
    const upload = await this.env.BUCKET.createMultipartUpload(key, {
      httpMetadata: { contentType: "application/octet-stream" },
    });
    try {
      const inserted = await this.db
        .prepare(
          "INSERT INTO training_files(id,request_id,kind,name,storage_key,mime,size,upload_id) SELECT ?,?,'weights',?,?,'application/octet-stream',?,? WHERE EXISTS(SELECT 1 FROM training_requests WHERE id=? AND status='quality_check') AND (SELECT COUNT(*) FROM training_files WHERE request_id=? AND kind='weights')<5",
        )
        .bind(
          fileId,
          r.id,
          name.slice(0, 200),
          key,
          size,
          upload.uploadId,
          r.id,
          r.id,
        )
        .run();
      if (!inserted.meta.changes)
        throw new LoraError(
          409,
          "The request changed or the upload limit was reached.",
        );
    } catch (e) {
      await upload.abort();
      throw e;
    }
    return { id: fileId, partSize: PART_SIZE };
  }
  async weights(fileId: string) {
    this.requireAdmin();
    const f = await this.db
      .prepare("SELECT * FROM training_files WHERE id=? AND kind='weights'")
      .bind(fileId)
      .first<TrainingFile>();
    if (!f) throw new LoraError(404, "Upload not found.");
    const r = await this.request(f.request_id);
    if (r.status !== "quality_check")
      throw new LoraError(
        409,
        "Delivery uploads are locked outside Quality Check.",
      );
    return f;
  }
  async uploadPart(fileId: string, part: number, bytes: Uint8Array) {
    const f = await this.weights(fileId);
    if (f.ready) throw new LoraError(409, "This upload is already complete.");
    const totalParts = Math.ceil(f.size / PART_SIZE);
    if (
      !Number.isInteger(part) ||
      part < 1 ||
      part > totalParts ||
      bytes.length !==
        (part === totalParts ? f.size - PART_SIZE * (part - 1) : PART_SIZE)
    )
      throw new LoraError(400, "Invalid upload chunk.");
    if (part === 1) validateSafetensors(bytes, f.size);
    const result = await this.env.BUCKET.resumeMultipartUpload(
      f.storage_key,
      f.upload_id!,
    ).uploadPart(part, bytes);
    await this.db
      .prepare(
        "INSERT INTO training_parts(id,file_id,part_number,etag,size) VALUES(?,?,?,?,?) ON CONFLICT(file_id,part_number) DO UPDATE SET etag=excluded.etag,size=excluded.size",
      )
      .bind(id(), fileId, part, result.etag, bytes.length)
      .run();
    return { ok: true };
  }
  async completeWeights(fileId: string) {
    const f = await this.weights(fileId);
    if (f.ready) return { id: f.id };
    const parts = await this.db
      .prepare(
        "SELECT part_number,etag,size FROM training_parts WHERE file_id=? ORDER BY part_number",
      )
      .bind(fileId)
      .all<{ part_number: number; etag: string; size: number }>();
    if (
      parts.results.length !== Math.ceil(f.size / PART_SIZE) ||
      parts.results.reduce((s, p) => s + p.size, 0) !== f.size
    )
      throw new LoraError(
        400,
        "Some upload chunks are missing. Resume the upload.",
      );
    const existing = await this.env.BUCKET.head(f.storage_key);
    if (!existing)
      await this.env.BUCKET.resumeMultipartUpload(
        f.storage_key,
        f.upload_id!,
      ).complete(
        parts.results.map((p) => ({ partNumber: p.part_number, etag: p.etag })),
      );
    await this.db
      .prepare("UPDATE training_files SET ready=1 WHERE id=?")
      .bind(fileId)
      .run();
    return { id: fileId };
  }
  async uploadProgress(fileId: string) {
    const f = await this.weights(fileId);
    const parts = await this.db
      .prepare(
        "SELECT part_number FROM training_parts WHERE file_id=? ORDER BY part_number",
      )
      .bind(fileId)
      .all<{ part_number: number }>();
    return {
      id: f.id,
      size: f.size,
      name: f.name,
      ready: f.ready,
      parts: parts.results.map((x) => x.part_number),
    };
  }
  async file(fileId: string) {
    const f = await this.db
      .prepare("SELECT * FROM training_files WHERE id=? AND ready=1")
      .bind(fileId)
      .first<TrainingFile>();
    if (!f) throw new LoraError(404, "File not found.");
    const r = await this.request(f.request_id);
    if (f.kind !== "dataset") {
      const lora = await this.db
        .prepare(
          "SELECT id,deleted_at FROM trained_loras WHERE request_id=? AND (file_id=? OR cover_id=?)",
        )
        .bind(r.id, f.id, f.id)
        .first<{ id: string; deleted_at: string | null }>();
      if (lora?.deleted_at || (!this.admin && !lora))
        throw new LoraError(404, "File not found.");
    }
    return f;
  }
  async deleteLora(loraId: string) {
    const lora = await this.db
      .prepare("SELECT * FROM trained_loras WHERE id=? AND user_id=?")
      .bind(loraId, this.user.userId)
      .first<TrainedLora>();
    if (!lora) throw new LoraError(404, "LoRA not found.");
    await this.db
      .prepare(
        "UPDATE trained_loras SET deleted_at=COALESCE(deleted_at,?) WHERE id=? AND user_id=?",
      )
      .bind(now(), loraId, this.user.userId)
      .run();
    const files = await this.db
      .prepare("SELECT storage_key FROM training_files WHERE id IN (?,?)")
      .bind(lora.file_id, lora.cover_id)
      .all<{ storage_key: string }>();
    await this.env.BUCKET.delete(files.results.map((f) => f.storage_key));
    return { ok: true };
  }
  async setSettings(value: unknown) {
    this.requireAdmin();
    const { maxImageMb } = parse(
      z.object({ maxImageMb: z.number().int().min(1).max(25) }),
      value,
    );
    await this.db
      .prepare(
        "INSERT INTO training_settings(id,max_image_mb) VALUES('default',?) ON CONFLICT(id) DO UPDATE SET max_image_mb=excluded.max_image_mb",
      )
      .bind(maxImageMb)
      .run();
    return { maxImageMb };
  }
}
