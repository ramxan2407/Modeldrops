import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { LoraService, type LoraBindings } from "../../lib/lora/service";
class Statement {
  values: any[] = [];
  constructor(
    public db: DatabaseSync,
    public sql: string,
  ) {}
  bind(...values: any[]) {
    const s = new Statement(this.db, this.sql);
    s.values = values;
    return s;
  }
  async first() {
    return this.db.prepare(this.sql).get(...this.values) || null;
  }
  async all() {
    return { results: this.db.prepare(this.sql).all(...this.values) };
  }
  async run() {
    return this.runSync();
  }
  runSync() {
    const result = this.db.prepare(this.sql).run(...this.values);
    return { success: true, meta: { changes: Number(result.changes) } };
  }
}
export function fixture() {
  const sql = new DatabaseSync(":memory:");
  sql.exec("PRAGMA foreign_keys=ON");
  for (const f of readdirSync(new URL("../../drizzle", import.meta.url))
    .filter((x) => x.endsWith(".sql"))
    .sort())
    sql.exec(
      readFileSync(new URL("../../drizzle/" + f, import.meta.url), "utf8"),
    );
  for (const id of ["alice", "bob", "admin"])
    sql
      .prepare("INSERT INTO users(id,name,email) VALUES(?,?,?)")
      .run(id, id, id + "@example.test");
  const db = {
    prepare: (query: string) => new Statement(sql, query),
    batch: async (statements: Statement[]) => {
      sql.exec("BEGIN");
      try {
        const results = statements.map((s) => s.runSync());
        sql.exec("COMMIT");
        return results;
      } catch (e) {
        sql.exec("ROLLBACK");
        throw e;
      }
    },
  };
  const objects = new Map<string, Uint8Array>(),
    uploads = new Map<string, Map<number, Uint8Array>>();
  const resume = (key: string, uploadId: string) => ({
    uploadId,
    key,
    uploadPart: async (part: number, bytes: Uint8Array) => {
      assert(uploads.has(uploadId));
      uploads.get(uploadId)!.set(part, bytes);
      return { partNumber: part, etag: "etag-" + part };
    },
    complete: async (parts: { partNumber: number }[]) => {
      const chunks = parts.map((p) =>
        uploads.get(uploadId)!.get(p.partNumber)!,
      );
      objects.set(key, Buffer.concat(chunks));
      uploads.delete(uploadId);
      return { key };
    },
    abort: async () => {
      uploads.delete(uploadId);
    },
  });
  const bucket = {
    put: async (key: string, bytes: Uint8Array) => {
      objects.set(key, bytes);
      return { key };
    },
    head: async (key: string) =>
      objects.has(key) ? { size: objects.get(key)!.length } : null,
    get: async (key: string) =>
      objects.has(key)
        ? {
            size: objects.get(key)!.length,
            body: new Blob([new Uint8Array(objects.get(key)!)]).stream(),
          }
        : null,
    delete: async (keys: string | string[]) => {
      for (const key of Array.isArray(keys) ? keys : [keys])
        objects.delete(key);
    },
    createMultipartUpload: async (key: string) => {
      const uploadId = crypto.randomUUID();
      uploads.set(uploadId, new Map());
      return resume(key, uploadId);
    },
    resumeMultipartUpload: resume,
  };
  const env = {
    DB: db,
    BUCKET: bucket,
    ADMIN_USER_IDS: "admin",
    LORA_ADMIN_EMAILS: "ops@example.test",
  } as unknown as LoraBindings;
  const service = (userId: string) =>
    new LoraService(env, {
      userId,
      email: userId + "@example.test",
      fullName: userId,
    });
  return {
    sql,
    env,
    objects,
    uploads,
    alice: service("alice"),
    bob: service("bob"),
    admin: service("admin"),
  };
}
export const png = new Uint8Array(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3O8AAAAASUVORK5CYII=",
    "base64",
  ),
);
