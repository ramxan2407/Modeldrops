import test from "node:test";
import { LoraService } from "../lib/lora/service";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import { fixture, png } from "./helpers/lora-fixture";
import { postgresFixture } from "./helpers/postgres-fixture";
import {
  seedReviewedCharacter,
  inviteFixture,
} from "./helpers/character-fixture";
import { qualityApprovalStatements } from "../lib/characters/quality";
import { drainStorageCleanup } from "../lib/storage-cleanup";
import { reserveProviderStatement } from "../lib/generation/budget";
import type { TestRuntime } from "./helpers/platform-runtime";

for (const backend of ["sqlite", "postgres"])
  test(`${backend}: controlled demo, immutable portraits, QA, recovery and cleanup`, async () => {
    const f =
      backend === "postgres"
        ? await postgresFixture()
        : { ...fixture(), close: async () => {} };
    const db = f.env.DB;
    const runtime: TestRuntime = {
      env: {
        ...f.env,
        APP_ORIGIN: "http://test.local",
        SUPER_ADMIN_USER_IDS: "admin",
        DEMO_MODE: "true",
        WAVESPEED_ENABLED: "true",
        WAVESPEED_API_KEY: "mock-key",
      },
      user: { userId: "alice", email: "alice@example.test" },
      jobs: [],
    };
    globalThis.__modelDropsTest = runtime;
    const root = fileURLToPath(new URL("../", import.meta.url)),
      shim = fileURLToPath(
        new URL("./helpers/platform-runtime.ts", import.meta.url),
      );
    const vite = await createServer({
      configFile: false,
      root,
      resolve: {
        alias: [
          { find: "cloudflare:workers", replacement: shim },
          { find: "@/lib/app-auth", replacement: shim },
          { find: "@", replacement: root },
        ],
      },
      server: { middlewareMode: true, hmr: false, ws: false, watch: null },
      optimizeDeps: { noDiscovery: true },
    });
    const originalFetch = globalThis.fetch;
    const submissions: Record<string, unknown>[] = [];
    globalThis.fetch = async (url, init) => {
      assert(
        String(url).startsWith("https://api.wavespeed.ai/"),
        "No unexpected network access",
      );
      if (init?.method === "POST") {
        submissions.push(JSON.parse(String(init.body)));
        return Response.json({
          code: 200,
          data: { id: "a".repeat(32), status: "created", outputs: [] },
        });
      }
      return Response.json({
        code: 200,
        data: {
          id: String(url).split("/").at(-2),
          status: "processing",
          outputs: [],
        },
      });
    };
    f.env.BUCKET.signedRead = async (key: string) =>
      `https://private-storage.example.com/${key}`;
    const who = (id: string) => {
      runtime.user = { userId: id, email: `${id}@example.test` };
    };
    const post = (path: string, data: unknown) =>
      new Request("http://test.local" + path, {
        method: "POST",
        headers: {
          origin: "http://test.local",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
    try {
      const server = await vite.ssrLoadModule("/lib/server.ts");
      const { AdminService } = await vite.ssrLoadModule(
        "/lib/admin/service.ts",
      );
      const { CharacterCheckout } = await vite.ssrLoadModule(
        "/lib/characters/checkout.ts",
      );
      const { resolveCharacterReferenceInputs } = await vite.ssrLoadModule(
        "/lib/generation/characters.ts",
      );
      const upgrade = await vite.ssrLoadModule(
        "/app/api/characters/upgrade/route.ts",
      );
      const refs = await vite.ssrLoadModule(
        "/app/api/characters/reference/route.ts",
      );
      const { publicCatalog } = await vite.ssrLoadModule(
        "/lib/marketing/public-catalog.ts",
      );
      const { reconcileGeneration } = await vite.ssrLoadModule(
        "/lib/generation/reconciliation.ts",
      );
      const { runGenerationJob } = await vite.ssrLoadModule(
        "/lib/generation/worker.ts",
      );
      const admin = new AdminService(db, runtime.env, "admin");
      await assert.rejects(server.auth(), /invitation/);
      await admin.mutate("tester", {
        id: "ALICE@example.test",
        enabled: true,
        reason: "Approved testing cohort",
      });
      await server.initialize(await server.auth());
      assert.equal(
        (await db
          .prepare(
            "SELECT SUM(amount) n FROM credit_transactions WHERE user_id='alice' AND wallet='demo'",
          )
          .first<{ n: number }>())!.n,
        0,
      );
      await admin.mutate("credits", {
        id: "alice",
        amount: 5000,
        key: crypto.randomUUID(),
        reason: "Assigned demo testing allowance",
      });
      await inviteFixture(db, "bob@example.test");
      const portraitA = crypto.randomUUID(),
        portraitB = crypto.randomUUID();
      for (const [id, key] of [
        [portraitA, "portrait-a.png"],
        [portraitB, "portrait-b.png"],
      ]) {
        await db
          .prepare(
            "INSERT INTO generation_assets(id,user_id,storage_key,mime,size) VALUES(?,'admin',?,'image/png',?)",
          )
          .bind(id, key, png.length)
          .run();
        await f.env.BUCKET.put(key, new Uint8Array(png));
      }
      const profile = {
        name: "Approved Alice",
        description: "An original fictional adult character.",
        age: 28,
        category: "Editorial",
        referenceAssetId: portraitA,
        approvalStatus: "pending" as const,
      };
      const update = {
        id: "valentina",
        price: 29,
        enabled: true,
        featured: true,
        profile,
        fictionalAdultConfirmed: true,
        reason: "Review character quality",
      };
      await admin.mutate("character", update);
      const pendingState = (await admin.state("characters")) as {
        rows: {
          id: string;
          referencePreview?: string;
          approvalStatus: string;
        }[];
      };
      const pendingPortrait = pendingState.rows.find(
        (c) => c.id === "valentina",
      )!;
      assert.equal(pendingPortrait.approvalStatus, "pending");
      assert.equal(
        pendingPortrait.referencePreview,
        `/api/characters/reference?id=valentina&asset=${portraitA}`,
      );
      who("admin");
      const privatePreview = await refs.GET(
        new Request(`http://test.local${pendingPortrait.referencePreview}`),
      );
      assert.equal(
        privatePreview.status,
        200,
        "A super admin can reopen the saved pending portrait",
      );
      assert.equal(privatePreview.headers.get("content-type"), "image/png");
      assert.deepEqual(new Uint8Array(await privatePreview.arrayBuffer()), png);
      who("alice");
      assert.equal(
        (
          await refs.GET(
            new Request(`http://test.local${pendingPortrait.referencePreview}`),
          )
        ).status,
        404,
        "Pending previews are not available to buyers",
      );
      await assert.rejects(
        admin.mutate("character", {
          ...update,
          profile: { ...profile, approvalStatus: "approved" },
        }),
        /Review|Enable/,
      );
      const a = await seedReviewedCharacter(db, {
        id: "valentina",
        ...profile,
      });
      await assert.rejects(
        qualityApprovalStatements(
          db,
          {
            ...(await publicCatalog())[0],
            id: "valentina",
            ...profile,
            referenceAssetId: portraitB,
          },
          "admin",
          a.ids,
          "Wrong portrait evidence",
        ),
        /exact portrait/,
      );
      await admin.mutate("character", {
        ...update,
        profile: { ...profile, approvalStatus: "approved" },
        reviewedGenerationIds: a.ids,
      });
      const checkout = new CharacterCheckout(db, "alice", runtime.env);
      await admin.mutate("character_permission", {
        id: "alice",
        characterId: "valentina",
        canView: true,
        canGenerate: false,
        reason: "Test read-only access",
      });
      const order = {
        characterId: "valentina",
        expectedCredits: 300,
        expectedVersionId: a.versionId,
        acceptedLicense: true,
        idempotencyKey: crypto.randomUUID(),
      };
      assert.equal((await checkout.quote("valentina")).ready, false);
      await assert.rejects(checkout.complete(order), /restricted/);
      assert.equal(
        (await db
          .prepare(
            "SELECT SUM(amount) n FROM credit_transactions WHERE user_id='alice' AND wallet='demo'",
          )
          .first<{ n: number }>())!.n,
        5000,
      );
      await admin.mutate("character_permission", {
        id: "alice",
        characterId: "valentina",
        canView: true,
        canGenerate: true,
        reason: "Restore generation access",
      });
      await checkout.complete(order);
      const published = await publicCatalog();
      assert.equal(published[0].name, "Approved Alice");
      assert(published[0].image.startsWith("/api/catalog/portrait"));
      assert.equal("referenceAssetId" in published[0], false);
      const b = await seedReviewedCharacter(db, {
        id: "valentina",
        ...profile,
        referenceAssetId: portraitB,
      });
      await admin.mutate("character", {
        ...update,
        profile: {
          ...profile,
          name: "New Alice",
          referenceAssetId: portraitB,
          approvalStatus: "approved",
        },
        reviewedGenerationIds: b.ids,
      });
      const owned = await resolveCharacterReferenceInputs(
        db,
        "alice",
        "valentina",
        "wavespeed-qwen-image-edit",
        {},
        "http://test.local",
      );
      assert.equal(
        owned.versionId,
        a.versionId,
        "Publishing a new portrait cannot change the purchased identity",
      );
      assert.equal(
        owned.inputs.image,
        "https://private-storage.example.com/portrait-a.png",
      );
      who("bob");
      assert.equal(
        (
          await refs.GET(
            new Request(
              `http://test.local/api/characters/reference?id=valentina&version=${encodeURIComponent(a.versionId)}`,
            ),
          )
        ).status,
        404,
        "Another user cannot fetch a purchased older portrait",
      );
      await assert.rejects(
        resolveCharacterReferenceInputs(
          db,
          "bob",
          "valentina",
          "wavespeed-qwen-image-edit",
          {},
          "http://test.local",
          { qa: true },
        ),
        /super administrators/,
      );
      who("alice");
      assert.equal(
        (
          await upgrade.POST(
            post("/api/characters/upgrade", {
              characterId: "valentina",
              fromVersion: a.versionId,
              toVersion: b.versionId,
              acceptedLicense: true,
            }),
          )
        ).status,
        200,
      );
      assert.equal(
        (
          await resolveCharacterReferenceInputs(
            db,
            "alice",
            "valentina",
            "wavespeed-qwen-image-edit",
            {},
            "http://test.local",
          )
        ).versionId,
        b.versionId,
      );

      const queue = async (state = "ready") => {
        const id = crypto.randomUUID(),
          now = new Date().toISOString();
        await db.batch([
          db
            .prepare(
              "INSERT INTO generations(id,user_id,character_id,character_version_id,model_id,prompt,settings,type,cost,idempotency_key,status,credit_wallet,updated_at) VALUES(?,'alice','valentina',?,'wavespeed-qwen-image-edit','Test portrait','{}','image',12,?,'processing','demo',?)",
            )
            .bind(id, a.versionId, id, now),
          db
            .prepare(
              "INSERT INTO generation_jobs(id,generation_id,status) VALUES(?,?,?)",
            )
            .bind(id, id, state === "ready" ? "queued" : "needs_review"),
          db
            .prepare(
              "INSERT INTO provider_requests(generation_id,endpoint,input_json,character_reference,state,reserved_microusd,created_at,updated_at) VALUES(?,'wavespeed-ai/qwen-image/edit',?,?,?,20000,?,?)",
            )
            .bind(
              id,
              JSON.stringify({
                image: "https://old.example/expired.png",
                prompt: "Test portrait",
                size: "1024*1024",
              }),
              `asset:${portraitA}`,
              state,
              now,
              now,
            ),
          server.ledgerStatement(
            "alice",
            -12,
            "generation_charge",
            "Reserved test credits",
            `charge:${id}`,
            id,
            "demo",
          ),
        ]);
        return { id, now };
      };
      const queued = await queue();
      await runGenerationJob(queued.id, "http://test.local");
      assert.equal(
        submissions.at(-1)?.image,
        "https://private-storage.example.com/portrait-a.png",
        "Queued work retains its accepted portrait across an upgrade",
      );
      const uncertain = await queue("uncertain"),
        before = submissions.length;
      const recovery = {
        id: uncertain.id,
        key: crypto.randomUUID(),
        expectedUpdatedAt: uncertain.now,
        action: "refund",
        reason: "Provider console reviewed; closing with customer refund",
        confirmed: true,
      };
      await assert.rejects(
        reconcileGeneration(runtime.env, "bob", recovery),
        /Super administrator/,
      );
      runtime.env.DEMO_MODE = "false";
      await reconcileGeneration(runtime.env, "admin", recovery);
      await reconcileGeneration(runtime.env, "admin", recovery);
      assert.deepEqual(
        {
          ...(await db
            .prepare(
              "SELECT amount,wallet FROM credit_transactions WHERE idempotency_key=?",
            )
            .bind(`refund:${uncertain.id}`)
            .first()),
        },
        { amount: 12, wallet: "demo" },
      );
      assert.equal(
        (await db
          .prepare(
            "SELECT reserved_microusd FROM provider_requests WHERE generation_id=?",
          )
          .bind(uncertain.id)
          .first<{ reserved_microusd: number }>())!.reserved_microusd,
        20000,
        "A customer refund does not erase uncertain provider spend",
      );
      runtime.env.DEMO_MODE = "true";
      const resume = await queue("uncertain");
      await reconcileGeneration(runtime.env, "admin", {
        ...recovery,
        id: resume.id,
        key: crypto.randomUUID(),
        expectedUpdatedAt: resume.now,
        action: "resume",
        requestId: "b".repeat(32),
      });
      assert.equal(
        (await db
          .prepare("SELECT state FROM provider_requests WHERE generation_id=?")
          .bind(resume.id)
          .first<{ state: string }>())!.state,
        "polling",
      );
      assert.equal(
        submissions.length,
        before,
        "Neither recovery action resubmits a paid generation",
      );

      // Old outstanding requests must still reserve capacity after UTC midnight.
      await db
        .prepare(
          "UPDATE provider_requests SET created_at='2000-01-01',updated_at='2000-01-01' WHERE generation_id=?",
        )
        .bind(resume.id)
        .run();
      const denied = crypto.randomUUID();
      await assert.rejects(
        db.batch([
          db
            .prepare(
              "INSERT INTO generations(id,user_id,model_id,prompt,settings,type,cost,idempotency_key,credit_wallet,updated_at) VALUES(?,'bob','wavespeed-qwen-image-edit','Quota test','{}','image',1,?,'demo',?)",
            )
            .bind(denied, denied, new Date().toISOString()),
          reserveProviderStatement(
            db,
            { ...runtime.env, WAVESPEED_DAILY_LIMIT_USD: "0.02" },
            {
              id: denied,
              userId: "bob",
              endpoint: "test",
              input: "{}",
              reference: null,
              reserve: 1000,
            },
          ),
        ]),
      );
      assert.equal(
        await db
          .prepare("SELECT id FROM generations WHERE id=?")
          .bind(denied)
          .first(),
        null,
        "Budget rejection rolls back admission",
      );

      // Losing storage access after metadata removal must not lose the cleanup task.
      const alice = new LoraService(f.env, {
        userId: "alice",
        email: "alice@example.test",
      });
      const draft = await alice.createDraft({
          characterName: "Fixture",
          characterType: "Human",
        }),
        file = await alice.uploadImage(
          draft.id,
          "dataset",
          "face.png",
          new Uint8Array(png),
        );
      const originalDelete = f.env.BUCKET.delete;
      f.env.BUCKET.delete = async () => {
        throw new Error("Transient storage outage");
      };
      await alice.removeFile(file.id);
      assert(
        await db.prepare("SELECT storage_key FROM storage_cleanup").first(),
      );
      assert.equal(
        await db
          .prepare("SELECT id FROM training_files WHERE id=?")
          .bind(file.id)
          .first(),
        null,
      );
      f.env.BUCKET.delete = originalDelete;
      await db.prepare("UPDATE storage_cleanup SET lease_until=''").run();
      await drainStorageCleanup(f.env);
      assert.equal(
        await db.prepare("SELECT storage_key FROM storage_cleanup").first(),
        null,
      );
    } finally {
      globalThis.fetch = originalFetch;
      await vite.close();
      await f.close();
      delete globalThis.__modelDropsTest;
    }
  });
