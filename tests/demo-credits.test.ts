import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import { fixture, png } from "./helpers/lora-fixture";
import { postgresFixture } from "./helpers/postgres-fixture";
import type { TestRuntime } from "./helpers/platform-runtime";

for (const backend of ["sqlite", "postgres"]) {
  test(`${backend}: demo approval, credit purchase, character generation and refunds`, async () => {
    const f =
      backend === "postgres"
        ? await postgresFixture()
        : { ...fixture(), close: async () => {} };
    const runtime: TestRuntime = {
      env: {
        ...f.env,
        APP_ORIGIN: "http://test.local",
        DEMO_MODE: "true",
        DEMO_WELCOME_CREDITS: "2000",
        SUPER_ADMIN_USER_IDS: "admin",
        WAVESPEED_API_KEY: "mock-key",
        WAVESPEED_ENABLED: "true",
        WAVESPEED_DAILY_LIMIT_USD: "5",
      },
      user: { userId: "alice", email: "alice@example.test" },
      jobs: [],
    };
    globalThis.__modelDropsTest = runtime;
    const root = fileURLToPath(new URL("../", import.meta.url));
    const shim = fileURLToPath(
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
    const fetchBefore = globalThis.fetch;
    let outcome = "completed";
    const sent: Record<string, unknown>[] = [];
    const kinds = new Map<string, string>();
    globalThis.fetch = async (url, init) => {
      const address = String(url);
      if (address.startsWith("https://static.wavespeed.ai/"))
        return new Response(
          address.endsWith(".mp4")
            ? new Uint8Array([
                0, 0, 0, 24, 102, 116, 121, 112, 105, 115, 111, 109,
              ])
            : new Uint8Array(png),
          {
            headers: {
              "Content-Type": address.endsWith(".mp4")
                ? "video/mp4"
                : "image/png",
            },
          },
        );
      assert(
        address.startsWith("https://api.wavespeed.ai/"),
        "Unexpected external request blocked by test",
      );
      if (address.endsWith("/model/price"))
        return Response.json({
          code: 200,
          data: {
            model_id: JSON.parse(String(init?.body)).model_id,
            price: 0.02,
            discounted_price: 0.02,
            currency: "USD",
          },
        });
      if (init?.method === "POST") {
        sent.push(JSON.parse(String(init.body)));
        const id = crypto.randomUUID().replaceAll("-", "");
        kinds.set(id, address.includes("kling") ? "mp4" : "png");
        return Response.json({
          code: 200,
          data: { id, status: "created", outputs: [] },
        });
      }
      const id = address.split("/").at(-2)!;
      return Response.json({
        code: 200,
        data: {
          id,
          status: outcome,
          outputs:
            outcome === "completed"
              ? [`https://static.wavespeed.ai/output.${kinds.get(id)}`]
              : [],
        },
      });
    };
    f.env.BUCKET.signedRead = async (key) =>
      `https://private-storage.example.com/${key}?signed=1`;
    const db = f.env.DB;
    const api = await vite.ssrLoadModule("/app/api/platform/route.ts");
    const admin = await vite.ssrLoadModule("/app/api/admin/route.ts");
    const checkout = await vite.ssrLoadModule(
      "/app/api/characters/checkout/route.ts",
    );
    const worker = await vite.ssrLoadModule("/lib/generation/worker.ts");
    const media = await vite.ssrLoadModule("/app/api/media/route.ts");
    const reference = await vite.ssrLoadModule(
      "/app/api/characters/reference/route.ts",
    );
    const request = (path: string, data: unknown) =>
      new Request(`http://test.local${path}`, {
        method: "POST",
        headers: {
          Origin: "http://test.local",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
    const who = (id: string) => {
      runtime.user = { userId: id, email: `${id}@example.test` };
    };
    const state = async () => {
      const r = await api.GET(
        new Request("http://test.local/api/platform?action=state"),
      );
      assert.equal(r.status, 200);
      return r.json();
    };
    const buy = (
      characterId = "valentina",
      expectedCredits = 300,
      idempotencyKey = crypto.randomUUID(),
    ) =>
      checkout.POST(
        request("/api/characters/checkout", {
          characterId,
          expectedCredits,
          idempotencyKey,
          acceptedLicense: true,
        }),
      );
    const balance = async (wallet = "demo") =>
      (await db
        .prepare(
          "SELECT COALESCE(SUM(amount),0) balance FROM credit_transactions WHERE user_id='alice' AND wallet=?",
        )
        .bind(wallet)
        .first<{ balance: number }>())!.balance;
    const assetId = crypto.randomUUID();
    const profile = {
      name: "Valentina",
      age: 28,
      category: "Editorial",
      description: "Fictional adult demo character",
      demoCreditPrice: 300,
      referenceAssetId: assetId,
      approvalStatus: "pending",
    };
    const approve = (
      approvalStatus: string,
      id = "valentina",
      demoCreditPrice = 300,
      portrait: string | null = assetId,
    ) =>
      admin.POST(
        request("/api/admin", {
          action: "character",
          data: {
            id,
            price: 29,
            enabled: true,
            featured: false,
            reason: "Demo testing character approval",
            profile: {
              ...profile,
              approvalStatus,
              demoCreditPrice,
              referenceAssetId: portrait,
            },
          },
        }),
      );
    const tick = async (id: string) => {
      await db
        .prepare(
          "UPDATE generation_jobs SET lease_until=? WHERE generation_id=?",
        )
        .bind("2000-01-01T00:00:00.000Z", id)
        .run();
      await worker.runGenerationJob(id, "http://test.local");
    };
    const generate = (video = false, characterId = "valentina") =>
      api.POST(
        request("/api/platform", {
          action: "generate",
          data: {
            characterId,
            modelId: video ? "wavespeed-kling-3" : "wavespeed-qwen-image-edit",
            prompt:
              "Editorial portrait of the adult character in soft daylight",
            idempotencyKey: crypto.randomUUID(),
            expectedCredits: 12,
            settings: video
              ? {
                  ratio: "16:9",
                  resolution: "standard",
                  outputs: 1,
                  duration: 5,
                  seed: null,
                }
              : {
                  ratio: "custom",
                  resolution: "custom",
                  outputs: 1,
                  duration: 5,
                  seed: null,
                  providerInputs: { size: "1024*1024", output_format: "png" },
                },
          },
        }),
      );
    try {
      assert.equal((await state()).account.balance, 2000);
      assert.equal(
        (await state()).account.balance,
        2000,
        "Welcome grant is idempotent",
      );
      assert.equal(await balance("standard"), 0);
      assert.equal((await buy()).status, 409, "Unapproved character blocked");
      assert.equal(
        (await approve("approved")).status,
        403,
        "Buyer cannot approve",
      );
      who("admin");
      assert.equal(
        (await approve("approved", "valentina", 300, null)).status,
        400,
        "Portrait required",
      );
      await db
        .prepare(
          "INSERT INTO generation_assets(id,user_id,storage_key,mime,size) VALUES(?,?,?,?,?)",
        )
        .bind(
          assetId,
          "admin",
          "private/admin/portrait.png",
          "image/png",
          png.length,
        )
        .run();
      await f.env.BUCKET.put("private/admin/portrait.png", new Uint8Array(png));
      assert.equal((await approve("pending")).status, 200);
      assert.equal(
        (
          await reference.GET(
            new Request(
              "http://test.local/api/characters/reference?id=valentina",
            ),
          )
        ).status,
        200,
        "Admin can preview pending portrait",
      );
      who("alice");
      assert.equal(
        (
          await reference.GET(
            new Request(
              "http://test.local/api/characters/reference?id=valentina",
            ),
          )
        ).status,
        404,
      );
      who("admin");
      assert.equal((await approve("approved")).status, 200);
      const adjustment = {
        action: "credits",
        data: {
          id: "alice",
          amount: 100,
          key: crypto.randomUUID(),
          reason: "Demo test balance top-up",
        },
      };
      assert.equal(
        (await admin.POST(request("/api/admin", adjustment))).status,
        200,
      );
      assert.equal(
        (await admin.POST(request("/api/admin", adjustment))).status,
        200,
      );
      assert.equal(await balance(), 2100, "Demo top-up is idempotent");
      assert.equal(await balance("standard"), 0);
      assert.equal(
        (
          await admin.POST(
            request("/api/admin", {
              ...adjustment,
              data: {
                ...adjustment.data,
                amount: -100,
                key: crypto.randomUUID(),
              },
            }),
          )
        ).status,
        200,
      );
      assert.equal(
        (
          await admin.POST(
            request("/api/admin", {
              action: "credits",
              data: {
                id: "bob",
                amount: 50,
                key: crypto.randomUUID(),
                reason: "Top-up before first demo login",
              },
            }),
          )
        ).status,
        200,
      );
      // Trainers are deliberately separate from super administrators.
      runtime.env.ADMIN_USER_IDS = "bob";
      who("bob");
      assert.equal((await approve("rejected")).status, 403);
      who("alice");
      assert.equal(
        (await buy("valentina", 1)).status,
        409,
        "Client cannot lower the price",
      );
      const key = crypto.randomUUID();
      const first = await buy("valentina", 300, key);
      assert.equal(first.status, 200, await first.clone().text());
      assert.equal(
        (await buy("valentina", 300, key)).status,
        200,
        "Same checkout can safely retry",
      );
      assert.equal((await buy()).status, 409, "Second purchase blocked");
      assert.equal(await balance(), 1700);
      const purchased = await state();
      assert.deepEqual(purchased.account.usableCharacters, ["valentina"]);
      assert.equal(purchased.account.purchases[0].creditsSpent, 300);
      assert.equal(purchased.account.demoMode, true);
      who("bob");
      assert.equal(
        (await state()).account.balance,
        2050,
        "First demo visit preserves prior admin top-up",
      );
      assert.equal(
        (await state()).account.balance,
        2050,
        "Welcome grant never repeats",
      );
      assert.deepEqual((await state()).account.usableCharacters, []);
      assert.equal(
        (await generate()).status,
        403,
        "Another account cannot generate bought character",
      );
      who("alice");
      for (const video of [false, true]) {
        const response = await generate(video);
        assert.equal(response.status, 202, await response.clone().text());
        const { id } = await response.json();
        await Promise.all(runtime.jobs.splice(0));
        assert.equal(
          sent.at(-1)?.image,
          "https://private-storage.example.com/private/admin/portrait.png?signed=1",
        );
        await tick(id);
        const result = await db
          .prepare("SELECT status,credit_wallet FROM generations WHERE id=?")
          .bind(id)
          .first<{ status: string; credit_wallet: string }>();
        assert.equal(result?.status, "completed");
        assert.equal(result?.credit_wallet, "demo");
        assert.equal(
          (await media.GET(new Request(`http://test.local/api/media?id=${id}`)))
            .status,
          200,
        );
        who("bob");
        assert.equal(
          (await media.GET(new Request(`http://test.local/api/media?id=${id}`)))
            .status,
          404,
        );
        who("alice");
      }
      assert.equal(
        await balance("standard"),
        0,
        "Generation never touches paid wallet",
      );
      const beforeFailed = await balance();
      outcome = "failed";
      const failed = await generate();
      assert.equal(failed.status, 202);
      const { id } = await failed.json();
      await Promise.all(runtime.jobs.splice(0));
      assert((await balance()) < beforeFailed);
      runtime.env.DEMO_MODE = "false";
      await tick(id);
      await tick(id);
      assert.equal(
        await balance(),
        beforeFailed,
        "Refund goes to original wallet exactly once even after demo is disabled",
      );
      assert.equal((await state()).account.balance, 0);
      assert.deepEqual((await state()).account.usableCharacters, []);
      assert.equal(
        (await buy("isla")).status,
        503,
        "Disabled demo cannot bypass payments",
      );
      runtime.env.DEMO_MODE = "true";
      who("admin");
      assert.equal((await approve("rejected")).status, 200);
      who("alice");
      assert.equal(
        (await generate()).status,
        409,
        "Withdrawn approval prevents spending",
      );
      assert.equal(await balance(), beforeFailed);
      who("admin");
      assert.equal((await approve("approved", "isla", 1000)).status, 200);
      assert.equal((await approve("approved", "sora", 1000)).status, 200);
      who("alice");
      const concurrent = await Promise.all([
        buy("isla", 1000),
        buy("sora", 1000),
      ]);
      assert.deepEqual(
        concurrent.map((r) => r.status).sort(),
        [200, 402],
        "Concurrent purchases cannot overspend",
      );
      assert.equal(await balance(), beforeFailed - 1000);
      const count = await db
        .prepare(
          "SELECT COUNT(*) n FROM character_orders WHERE user_id='alice'",
        )
        .first<{ n: number }>();
      assert.equal(
        count?.n,
        2,
        "Failed purchase leaves no order or entitlement",
      );
      who("admin");
      assert.equal((await approve("approved")).status, 200);
      const reduceTo150 = {
        action: "credits",
        data: {
          id: "alice",
          amount: 150 - (await balance()),
          key: crypto.randomUUID(),
          reason: "Check concurrent generation charges",
        },
      };
      assert.equal(
        (await admin.POST(request("/api/admin", reduceTo150))).status,
        200,
      );
      who("alice");
      outcome = "completed";
      const racingJobs = await Promise.all([generate(true), generate(true)]);
      assert.deepEqual(racingJobs.map((r) => r.status).sort(), [202, 402]);
      await Promise.all(runtime.jobs.splice(0));
      assert.equal(
        await balance(),
        30,
        "Concurrent jobs cannot silently skip an insufficient-balance debit",
      );
      assert.equal(
        (
          await db
            .prepare("SELECT COUNT(*) n FROM generations WHERE user_id='alice'")
            .first<{ n: number }>()
        )?.n,
        4,
        "Rejected generation leaves no orphan job",
      );
    } finally {
      await Promise.allSettled(runtime.jobs);
      globalThis.fetch = fetchBefore;
      await vite.close();
      await f.close();
      delete globalThis.__modelDropsTest;
    }
  });
}
