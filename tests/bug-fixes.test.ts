import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { fixture, png } from "./helpers/lora-fixture";
import { postgresFixture } from "./helpers/postgres-fixture";
import {
  seedReviewedCharacter,
  inviteFixture,
} from "./helpers/character-fixture";
import { drainStorageCleanup } from "../lib/storage-cleanup";
import { characterPrice } from "../lib/credits";
import type { TestRuntime } from "./helpers/platform-runtime";

for (const backend of ["sqlite", "postgres"]) {
  test(`${backend}: price consent, upload limits and scheduled transfer cleanup`, async () => {
    const memory = backend === "postgres" ? await postgresFixture() : fixture();
    const f = memory,
      db = f.env.DB;
    const runtime: TestRuntime = {
      env: {
        ...f.env,
        DEMO_MODE: "true",
        WAVESPEED_ENABLED: "true",
        WAVESPEED_API_KEY: "mock-only",
        SUPER_ADMIN_USER_IDS: "admin",
        APP_ORIGIN: "http://test.local",
        GENERATION_USER_DAILY_LIMIT_USD: "100",
        GENERATION_REQUESTS_PER_MINUTE: "100",
      },
      user: { userId: "alice", email: "alice@example.test" },
      jobs: [],
    };
    globalThis.__modelDropsTest = runtime;
    const root = process.cwd(),
      shim = root + "/tests/helpers/platform-runtime.ts";
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
    const oldFetch = globalThis.fetch;
    let submissions = 0;
    globalThis.fetch = async (url, options) => {
      assert(
        String(url).startsWith("https://api.wavespeed.ai/"),
        "No unexpected network traffic",
      );
      if (String(url).endsWith("/model/price"))
        return Response.json({
          code: 200,
          data: {
            model_id: JSON.parse(String(options?.body)).model_id,
            price: 0.02,
            discounted_price: 0.02,
            currency: "USD",
          },
        });
      if (options?.method === "POST") {
        submissions++;
        return Response.json({
          code: 200,
          data: {
            id: crypto.randomUUID().replaceAll("-", ""),
            status: "created",
            outputs: [],
          },
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
    f.env.BUCKET.signedRead = async (key) =>
      "https://private-storage.example.com/" + key;
    const request = (path: string, data: unknown) =>
      new Request("http://test.local/api/" + path, {
        method: "POST",
        headers: {
          origin: "http://test.local",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
    const balance = async () =>
      (await db
        .prepare(
          "SELECT SUM(amount) n FROM credit_transactions WHERE user_id='alice' AND wallet='demo'",
        )
        .first<{ n: number }>())!.n;
    try {
      const server = await vite.ssrLoadModule("/lib/server.ts");
      const { AdminService } = await vite.ssrLoadModule(
        "/lib/admin/service.ts",
      );
      const { CharacterCheckout } = await vite.ssrLoadModule(
        "/lib/characters/checkout.ts",
      );
      const platform = await vite.ssrLoadModule("/app/api/platform/route.ts");
      const quotes = await vite.ssrLoadModule("/app/api/image-models/route.ts");
      const upload = await vite.ssrLoadModule("/app/api/upload/route.ts");
      const transfer = await vite.ssrLoadModule("/app/api/transfers/route.ts");
      const loraFile = await vite.ssrLoadModule("/app/api/lora/file/route.ts");
      const loraZip = await vite.ssrLoadModule("/app/api/lora/zip/route.ts");
      const { LoraService } = await vite.ssrLoadModule("/lib/lora/service.ts");
      const admin = new AdminService(db, runtime.env, "admin");
      await inviteFixture(db, "alice@example.test");
      await server.initialize(await server.auth());
      await admin.mutate("credits", {
        id: "alice",
        amount: 5000,
        key: crypto.randomUUID(),
        reason: "Regression allowance",
      });
      const portrait = crypto.randomUUID();
      await db
        .prepare(
          "INSERT INTO generation_assets(id,user_id,storage_key,mime,size,created_at) VALUES(?,'admin','original-portrait','image/png',?,'2000-01-01 00:00:00')",
        )
        .bind(portrait, png.length)
        .run();
      await f.env.BUCKET.put("original-portrait", png);
      await db
        .prepare(
          "INSERT INTO character_controls(id,enabled,price,profile) VALUES('valentina',1,29,?)",
        )
        .bind(
          JSON.stringify({
            name: "Test character",
            description: "Original fictional adult test portrait",
            age: 28,
            category: "Editorial",
            referenceAssetId: portrait,
            approvalStatus: "approved",
            demoCreditPrice: 300,
          }),
        )
        .run();
      const qa = await seedReviewedCharacter(db, {
        id: "valentina",
        referenceAssetId: portrait,
      });
      await new CharacterCheckout(db, "alice", runtime.env).complete({
        characterId: "valentina",
        expectedCredits: 300,
        expectedVersionId: qa.versionId,
        acceptedLicense: true,
        idempotencyKey: crypto.randomUUID(),
      });
      const video = {
        idempotencyKey: crypto.randomUUID(),
        characterId: "valentina",
        modelId: "wavespeed-kling-3",
        prompt: "Subtle motion of the fictional adult reference",
        expectedCredits: 120,
        settings: {
          ratio: "1:1",
          resolution: "standard",
          outputs: 1,
          negative: "",
          seed: null,
          duration: 5,
        },
      };
      const generate = (data: unknown) =>
        platform.POST(request("platform", { action: "generate", data }));
      await admin.mutate("model", {
        id: video.modelId,
        credits: 240,
        enabled: true,
        reason: "Price changed while Studio was open",
      });
      assert.equal((await generate(video)).status, 409);
      assert.equal(
        (await generate({ ...video, expectedCredits: undefined })).status,
        400,
      );
      assert.equal(await balance(), 4700);
      assert.equal(submissions, 0);
      assert.equal(
        runtime.jobs.length,
        0,
        "No rejected-price jobs are scheduled",
      );
      const accepted = await generate({ ...video, expectedCredits: 240 });
      assert.equal(accepted.status, 202);
      assert.equal((await accepted.json()).cost, 240);
      await Promise.all(runtime.jobs.splice(0));
      await admin.mutate("model", {
        id: video.modelId,
        credits: 480,
        enabled: true,
        reason: "Price changed after original submission",
      });
      assert.equal(
        (await generate({ ...video, expectedCredits: 240 })).status,
        200,
        "Idempotent retries return the original job",
      );
      assert.equal(submissions, 1);
      assert.equal(await balance(), 4460);
      const modelId = "wavespeed-qwen-image-edit";
      await admin.mutate("model", {
        id: modelId,
        credits: 1000,
        enabled: true,
        reason: "Configured image minimum",
      });
      const quoted = await quotes.POST(
        request("image-models", {
          modelId,
          characterId: "valentina",
          prompt: "Editorial portrait",
          inputs: {},
        }),
      );
      assert.equal(quoted.status, 200);
      assert.equal((await quoted.json()).credits, 1000);
      const image = {
        ...video,
        idempotencyKey: crypto.randomUUID(),
        modelId,
        expectedCredits: 1000,
        settings: {
          ...video.settings,
          ratio: "custom",
          resolution: "custom",
          providerInputs: {},
        },
      };
      assert.equal(
        (await generate({ ...image, expectedCredits: 12 })).status,
        409,
      );
      const result = await generate(image);
      assert.equal(result.status, 202);
      assert.equal((await result.json()).cost, 1000);
      await Promise.all(runtime.jobs.splice(0));
      assert.equal(await balance(), 3460);
      await admin.mutate("model", {
        id: modelId,
        credits: 1,
        enabled: true,
        reason: "Provider price still protects retail floor",
      });
      assert.equal(
        (
          await (
            await quotes.POST(
              request("image-models", {
                modelId,
                characterId: "valentina",
                prompt: "Editorial portrait",
                inputs: {},
              }),
            )
          ).json()
        ).credits,
        12,
      );

      // Local uploads exercise the actual routes used by uploadFile(), including ZIP.
      assert.deepEqual(
        await (
          await transfer.POST(
            request("transfers", { target: "/api/upload", size: png.length }),
          )
        ).json(),
        { direct: false },
      );
      const trainer = new LoraService(runtime.env, runtime.user);
      const draft = await trainer.createDraft({
        characterName: "Upload regression",
        characterType: "Human",
      });
      for (let i = 0; i < 15; i++) {
        const response = await loraFile.POST(
          new Request(
            `http://test.local/api/lora/file?request=${draft.id}&kind=dataset&name=${i}.png`,
            {
              method: "POST",
              headers: {
                origin: "http://test.local",
                "Content-Type": "application/octet-stream",
              },
              body: png,
            },
          ),
        );
        assert.equal(response.status, 201);
      }
      await trainer.submit(draft.id);
      assert.equal(
        (
          await loraZip.GET(
            new Request(`http://test.local/api/lora/zip?request=${draft.id}`),
          )
        ).status,
        403,
      );
      runtime.user = { userId: "admin", email: "admin@example.test" };
      const zip = await loraZip.GET(
        new Request(`http://test.local/api/lora/zip?request=${draft.id}`),
      );
      assert.equal(zip.status, 200);
      assert.equal(zip.headers.get("content-type"), "application/zip");
      assert.deepEqual(
        [...new Uint8Array(await zip.arrayBuffer()).slice(0, 4)],
        [80, 75, 3, 4],
      );

      runtime.user = { userId: "admin", email: "admin@example.test" };
      for (let i = 0; i < 50; i++)
        await db
          .prepare(
            "INSERT INTO generation_assets(id,user_id,storage_key,mime,size,created_at) VALUES(?,'admin',?,'image/png',1,'2000-01-01T00:00:00.000Z')",
          )
          .bind(crypto.randomUUID(), `old-${i}`)
          .run();
      const newUpload = () => {
        const body = new FormData();
        body.append(
          "file",
          new Blob([png], { type: "image/png" }),
          "portrait.png",
        );
        return upload.POST(
          new Request("http://test.local/api/upload", {
            method: "POST",
            headers: { origin: "http://test.local" },
            body,
          }),
        );
      };
      assert.equal(
        (await newUpload()).status,
        201,
        "Historical uploads must not permanently exhaust the quota",
      );
      assert(
        await f.env.BUCKET.head("original-portrait"),
        "Purchased portraits are retained",
      );
      for (let i = 0; i < 49; i++)
        await db
          .prepare(
            "INSERT INTO generation_assets(id,user_id,storage_key,mime,size) VALUES(?,'admin',?,'image/png',1)",
          )
          .bind(crypto.randomUUID(), `recent-${i}`)
          .run();
      assert.equal(
        (await newUpload()).status,
        429,
        "Daily abuse limit remains enforced",
      );

      const now = Date.now();
      for (const [id, age, claimed] of [
        ["abandoned", -600000, 0],
        ["replayed", -600000, 1],
        ["active", 300000, 0],
        ["processing", -1000, 1],
      ] as const) {
        await db
          .prepare(
            "INSERT INTO upload_transfers(id,user_id,storage_key,target,size,expires_at,claimed) VALUES(?,'alice',?,'/api/upload',1,?,?)",
          )
          .bind(id, `transfers/alice/${id}`, now + age, claimed)
          .run();
        await f.env.BUCKET.put(`transfers/alice/${id}`, new Uint8Array([1]));
      }
      const remove = f.env.BUCKET.delete.bind(f.env.BUCKET);
      let unavailable = true;
      f.env.BUCKET.delete = async (key) => {
        if (unavailable && key === "transfers/alice/abandoned")
          throw Error("Storage unavailable");
        return remove(key);
      };
      await drainStorageCleanup(runtime.env, 10);
      assert.equal(
        await db
          .prepare("SELECT id FROM upload_transfers WHERE id='abandoned'")
          .first(),
        null,
      );
      assert(
        await db
          .prepare(
            "SELECT storage_key FROM storage_cleanup WHERE storage_key='transfers/alice/abandoned' AND attempts=1",
          )
          .first(),
      );
      assert.equal(await f.env.BUCKET.head("transfers/alice/replayed"), null);
      assert(await f.env.BUCKET.head("transfers/alice/active"));
      assert(await f.env.BUCKET.head("transfers/alice/processing"));
      unavailable = false;
      await db
        .prepare(
          "UPDATE storage_cleanup SET lease_until='' WHERE storage_key='transfers/alice/abandoned'",
        )
        .run();
      await drainStorageCleanup(runtime.env, 10);
      assert.equal(await f.env.BUCKET.head("transfers/alice/abandoned"), null);
      assert.equal(
        await db.prepare("SELECT storage_key FROM storage_cleanup").first(),
        null,
      );
    } finally {
      await Promise.allSettled(runtime.jobs);
      globalThis.fetch = oldFetch;
      await vite.close();
      if ("close" in memory && typeof memory.close === "function")
        await memory.close();
      else memory.sql.close();
    }
  });
}

test("Marketplace sorting and free filtering use the displayed wallet currency", () => {
  const catalog = [
    { name: "A", price: 0, demoCreditPrice: 500 },
    { name: "B", price: 29, demoCreditPrice: 100 },
  ];
  assert.deepEqual(
    [...catalog]
      .sort((a, b) => characterPrice(a, true) - characterPrice(b, true))
      .map((c) => c.name),
    ["B", "A"],
  );
  assert.deepEqual(
    catalog.filter((c) => characterPrice(c, true) === 0),
    [],
  );
  assert.deepEqual(
    catalog.filter((c) => characterPrice(c, false) === 0).map((c) => c.name),
    ["A"],
  );
  assert.equal(characterPrice({ price: 29 }, true), 300);
});
