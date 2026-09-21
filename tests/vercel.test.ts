import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { PostgresDatabase, postgresSql } from "../lib/vercel/postgres";
import { LoraService } from "../lib/lora/service";
import { AdminService } from "../lib/admin/service";
import { fixture, png } from "./helpers/lora-fixture";

test("Postgres parameter conversion preserves quoted text", () => {
  assert.equal(
    postgresSql("SELECT '?' x, ? y, 'it''s?' z"),
    "SELECT '?' x, $1 y, 'it''s?' z",
  );
  assert.equal(
    postgresSql("INSERT OR IGNORE INTO users(id) VALUES(?)"),
    "INSERT INTO users(id) VALUES($1) ON CONFLICT DO NOTHING",
  );
});
test("Vercel Postgres migration supports private training and atomic admin credits", async () => {
  const pg = new PGlite({ parsers: { 1700: Number } });
  try {
    await pg.exec(
      await readFile(
        new URL("../migrations/vercel/001_workspace.sql", import.meta.url),
        "utf8",
      ),
    );
    const db = new PostgresDatabase({
      transaction: (fn) =>
        pg.transaction(async (tx) => {
          await tx.exec("SET LOCAL search_path TO model_drops");
          return fn({
            query: async (sql, values) => {
              const r = await tx.query<Record<string, unknown>>(sql, values);
              return { rows: r.rows, affectedRows: r.affectedRows };
            },
          });
        }),
    });
    for (const name of ["alice", "bob", "admin"])
      await db
        .prepare("INSERT OR IGNORE INTO users(id,name,email) VALUES(?,?,?)")
        .bind(name, name, name + "@example.test")
        .run();
    const memory = fixture();
    const env = {
      ...memory.env,
      DB: db as unknown as D1Database,
      SUPER_ADMIN_USER_IDS: "admin",
    };
    const alice = new LoraService(env, {
      userId: "alice",
      email: "alice@example.test",
    });
    const bob = new LoraService(env, {
      userId: "bob",
      email: "bob@example.test",
    });
    const trainer = new LoraService(env, {
      userId: "admin",
      email: "admin@example.test",
    });
    const admin = new AdminService(env.DB, env, "admin");
    const request = await alice.createDraft({
      characterName: "Nova",
      characterType: "Human",
    });
    await assert.rejects(bob.request(request.id));
    for (let i = 0; i < 15; i++)
      await alice.uploadImage(request.id, "dataset", i + ".png", png);
    await alice.submit(request.id);
    for (const status of ["approved", "training", "quality_check"] as const) {
      const r = await trainer.request(request.id);
      await trainer.transition(r.id, r.revision, status);
    }
    assert.equal((await alice.request(request.id)).status, "quality_check");
    assert.equal((await alice.state()).requests.length, 1);
    const credit = {
      id: "alice",
      amount: 100,
      key: crypto.randomUUID(),
      reason: "Vercel migration test",
    };
    await admin.mutate("credits", credit);
    await admin.mutate("credits", credit);
    assert.equal(
      (
        await db
          .prepare(
            "SELECT SUM(amount) n FROM credit_transactions WHERE user_id=?",
          )
          .bind("alice")
          .first<{ n: number }>()
      )?.n,
      100,
    );
    await assert.rejects(
      admin.mutate("credits", {
        ...credit,
        amount: -101,
        key: crypto.randomUUID(),
      }),
    );
    await assert.rejects(db.prepare("DELETE FROM credit_transactions").run());
    for (const section of [
      "overview",
      "users",
      "credits",
      "payments",
      "models",
      "characters",
      "moderation",
      "activity",
    ] as const)
      await admin.state(section);
    await assert.rejects(
      db.batch([
        db
          .prepare("INSERT INTO users(id,name,email) VALUES(?,?,?)")
          .bind("rolled-back", "Test", "x@example.test"),
        db
          .prepare("INSERT INTO users(id,name,email) VALUES(?,?,?)")
          .bind("alice", "Conflict", "x@example.test"),
      ]),
    );
    assert.equal(
      await db
        .prepare("SELECT id FROM users WHERE id=?")
        .bind("rolled-back")
        .first(),
      null,
    );
    memory.sql.close();
  } finally {
    await pg.close();
  }
});
