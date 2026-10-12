import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import { postgresSql } from "../lib/vercel/postgres";

for (const backend of ["sqlite", "postgres"]) {
  test(`${backend}: migration pins queued jobs to their recorded portrait, not the replacement`, async () => {
    const sqlite = backend === "sqlite" ? new DatabaseSync(":memory:") : null;
    const pg = backend === "postgres" ? new PGlite() : null;
    const exec = async (sql: string) => (pg ? pg.exec(sql) : sqlite!.exec(sql));
    const run = async (sql: string, params: string[] = []) =>
      pg
        ? pg.query(postgresSql(sql), params)
        : sqlite!.prepare(sql).run(...params);
    const rows = async (sql: string): Promise<Record<string, unknown>[]> =>
      pg
        ? (await pg.query<Record<string, unknown>>(sql)).rows
        : sqlite!.prepare(sql).all();
    try {
      const dir = new URL(
        backend === "sqlite" ? "../drizzle/" : "../migrations/vercel/",
        import.meta.url,
      );
      const migrations = (await readdir(dir))
        .filter((f) => f.endsWith(".sql"))
        .sort();
      const targetIndex = migrations.findIndex((file) =>
        file.includes("demo_readiness"),
      );
      assert(targetIndex >= 0);
      const last = migrations[targetIndex];
      for (const file of migrations.slice(0, targetIndex))
        await exec(await readFile(new URL(file, dir), "utf8"));
      await run(
        "INSERT INTO users(id,name,email) VALUES('buyer','Buyer','buyer@example.test')",
      );
      for (const id of ["funded", "unfunded", "welcome-only", "suspended"]) {
        await run("INSERT INTO users(id,name,email) VALUES(?,?,?)", [
          id,
          id,
          `${id}@example.test`,
        ]);
        if (id !== "unfunded")
          await run(
            "INSERT INTO credit_transactions(id,user_id,amount,type,description,balance_before,balance_after,idempotency_key,wallet) VALUES(?,?,10,?,'Existing allocation',0,10,?,'demo')",
            [id, id, id === "welcome-only" ? "welcome" : "promotion", id],
          );
      }
      await run("UPDATE users SET suspended=1 WHERE id='suspended'");
      await run(
        "INSERT INTO ai_models(id,name,provider,type,credits,config) VALUES('test-model','Test model','WaveSpeed','image',12,'{}')",
      );
      for (const id of ["old-portrait", "new-portrait"])
        await run(
          "INSERT INTO generation_assets(id,user_id,storage_key,mime,size) VALUES(?,'buyer',?,'image/png',100)",
          [id, id],
        );
      await run(
        "INSERT INTO character_controls(id,profile) VALUES('valentina',?)",
        [
          JSON.stringify({
            referenceAssetId: "new-portrait",
            approvalStatus: "approved",
            name: "Fictional adult",
          }),
        ],
      );
      await run(
        "INSERT INTO character_orders(id,user_id,character_id,amount_cents,currency,mode,status,license_snapshot,idempotency_key,credits_spent) VALUES('order','buyer','valentina',0,'demo_credits','test','test_completed','Terms','order',300)",
      );
      await run(
        "INSERT INTO character_entitlements(user_id,character_id,order_id) VALUES('buyer','valentina','order')",
      );
      for (const id of ["old-portrait", "new-portrait", "missing-portrait"]) {
        await run(
          "INSERT INTO generations(id,user_id,character_id,model_id,prompt,settings,type,cost,idempotency_key,status,credit_wallet,updated_at) VALUES(?,'buyer','valentina','test-model','Portrait','{}','image',12,?,'queued','demo','2026-01-01')",
          [id, id],
        );
        await run("INSERT INTO generation_jobs(id,generation_id) VALUES(?,?)", [
          id,
          id,
        ]);
        await run(
          "INSERT INTO provider_requests(generation_id,endpoint,input_json,character_reference,state,reserved_microusd,created_at,updated_at) VALUES(?,'wavespeed-ai/qwen-image/edit','{}',?,'ready',20000,'2026-01-01','2026-01-01')",
          [id, `asset:${id}`],
        );
      }
      await exec(await readFile(new URL(last, dir), "utf8"));
      assert.deepEqual(
        (await rows("SELECT email FROM demo_testers ORDER BY email")).map(
          (row) => row.email,
        ),
        ["buyer@example.test", "funded@example.test"],
        "Preserve existing demo buyers and explicit grants without inviting unfunded, welcome-only or suspended users",
      );
      const generations = (await rows(
        "SELECT g.id,g.character_version_id,v.profile,g.status,p.state FROM generations g LEFT JOIN character_versions v ON v.id=g.character_version_id JOIN provider_requests p ON p.generation_id=g.id ORDER BY g.id",
      )) as {
        id: string;
        character_version_id: string | null;
        profile: string | null;
        status: string;
        state: string;
      }[];
      for (const g of generations) {
        assert.equal(g.status, "queued");
        assert.equal(g.state, "ready");
        if (g.id === "missing-portrait")
          assert.equal(
            g.character_version_id,
            null,
            "Missing assets cannot be replaced with another portrait",
          );
        else {
          assert.equal(g.character_version_id, `valentina@asset:${g.id}`);
          assert.equal(JSON.parse(g.profile!).referenceAssetId, g.id);
        }
      }
      assert.equal(
        (await rows("SELECT version_id FROM character_entitlements"))[0]
          .version_id,
        "valentina@asset:new-portrait",
      );
      assert.equal(
        (
          await rows(
            "SELECT reviewed_models FROM character_versions WHERE id='valentina@asset:old-portrait'",
          )
        )[0].reviewed_models,
        "[]",
        "Historical versions do not invent new QA approval evidence",
      );
    } finally {
      if (pg) await pg.close();
      sqlite?.close();
    }
  });
}
