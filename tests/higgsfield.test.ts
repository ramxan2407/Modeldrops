import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import { fixture, png } from "./helpers/lora-fixture";
import { postgresFixture } from "./helpers/postgres-fixture";
import { generationInput } from "../lib/higgsfield/models";
import { downloadOutput } from "../lib/higgsfield/client";
const root = fileURLToPath(new URL("../", import.meta.url));
const settings = {
  ratio: "1:1",
  resolution: "720",
  outputs: 1,
  negative: "",
  seed: null,
  duration: 5,
};
await test("Higgsfield model schemas reject unsupported references and ignored controls", () => {
  assert.throws(() =>
    generationInput("higgsfield-soul-2", "test", settings, "nova"),
  );
  assert.throws(() =>
    generationInput("higgsfield-soul-2", "test", { ...settings, outputs: 2 }),
  );
  assert.throws(() =>
    generationInput("higgsfield-soul-2", "test", { ...settings, seed: 0 }),
  );
  assert.throws(() =>
    generationInput("higgsfield-kling-3", "test", { ...settings, seed: 8 }),
  );
  assert.deepEqual(generationInput("higgsfield-kling-3", "test", settings), {
    prompt: "test",
    duration: 5,
    aspect_ratio: "1:1",
    sound: "off",
    multi_shots: false,
    cfg_scale: 0.5,
  });
});
await test("output ingestion rejects foreign hosts, redirects, excessive sizes and MIME spoofing", async () => {
  const env = {};
  for (const url of [
    "http://images.higgs.ai/file",
    "https://127.0.0.1/file",
    "https://images.higgs.ai.evil.test/x",
    "https://name:pass@images.higgs.ai/x",
  ])
    await assert.rejects(
      downloadOutput(url, "image", env, async () => {
        throw new Error("Must not fetch");
      }),
    );
  await assert.rejects(
    downloadOutput(
      "https://images.higgs.ai/x",
      "image",
      env,
      async () =>
        new Response("<html>", { headers: { "Content-Type": "image/png" } }),
    ),
  );
  await assert.rejects(
    downloadOutput(
      "https://images.higgs.ai/x",
      "image",
      env,
      async () =>
        new Response(png, {
          headers: {
            "Content-Type": "image/png",
            "Content-Length": "999999999",
          },
        }),
    ),
  );
  const good = await downloadOutput(
    "https://images.higgs.ai/x",
    "image",
    env,
    async (_url, options) => {
      assert.equal(options?.redirect, "error");
      assert.equal(options?.headers, undefined);
      return new Response(png, { headers: { "Content-Type": "image/png" } });
    },
  );
  assert.equal(good.extension, "png");
});
for (const backend of ["sqlite", "postgres"]) {
  await test(`${backend}: live Higgsfield jobs preserve credit, ownership and submission invariants`, async () => {
    const f =
      backend === "postgres"
        ? await postgresFixture()
        : { ...fixture(), close: async () => {} };
    const runtime = {
      env: {
        ...f.env,
        HF_API_KEY_ID: "test-id",
        HF_API_KEY_SECRET: "test-secret",
        HIGGSFIELD_ENABLED: "true",
        HIGGSFIELD_DAILY_LIMIT_USD: "5",
        CRON_SECRET: "test-cron-secret",
        SUPER_ADMIN_USER_IDS: "admin",
      },
      user: { userId: "alice", email: "alice@example.test", fullName: "Alice" },
      jobs: [] as Promise<unknown>[],
    };
    (globalThis as any).__modelDropsTest = runtime;
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
    const originalFetch = globalThis.fetch;
    let submissions = 0,
      outcome = "queued",
      submitFailure = "",
      storageFailure = false;
    const videoRequests = new Set<string>();
    const mediaTypes = new Map<string, string>();
    const originalPut = runtime.env.BUCKET.put.bind(runtime.env.BUCKET);
    const originalGet = runtime.env.BUCKET.get.bind(runtime.env.BUCKET);
    (runtime.env.BUCKET as any).put = async (
      key: string,
      bytes: Uint8Array,
      options: any,
    ) => {
      mediaTypes.set(key, options.httpMetadata.contentType);
      return originalPut(key, bytes);
    };
    (runtime.env.BUCKET as any).get = async (key: string) => {
      const object = await originalGet(key);
      return object
        ? { ...object, httpMetadata: { contentType: mediaTypes.get(key) } }
        : null;
    };
    globalThis.fetch = async (url, options) => {
      const address = String(url);
      if (address.startsWith("https://videos.higgs.ai"))
        return new Response(
          new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112, 105, 115, 111, 109]),
          { headers: { "Content-Type": "video/mp4" } },
        );
      if (address.startsWith("https://images.higgs.ai")) {
        if (storageFailure) throw new Error("Temporary download outage");
        return new Response(png, { headers: { "Content-Type": "image/png" } });
      }
      assert.match(address, /^https:\/\/api.higgsfield.ai\//);
      assert.equal(
        (options?.headers as any).Authorization,
        "Key test-id:test-secret",
      );
      if (options?.method === "POST") {
        submissions++;
        if (submitFailure === "timeout")
          throw new Error("Timeout after acceptance");
        if (submitFailure === "rejected")
          return new Response("{}", { status: 403 });
        const request_id = crypto.randomUUID();
        if (address.includes("kling-video")) videoRequests.add(request_id);
        return Response.json({ request_id, status: "queued" });
      }
      const request_id = address.split("/").at(-2);
      return Response.json({
        request_id,
        status: outcome,
        video:
          outcome === "completed" && videoRequests.has(request_id!)
            ? { url: "https://videos.higgs.ai/output.mp4" }
            : undefined,
        images:
          outcome === "completed" && !videoRequests.has(request_id!)
            ? [{ url: "https://images.higgs.ai/output.png" }]
            : undefined,
      });
    };
    const db = runtime.env.DB;
    const post = (action: string, data: unknown) =>
      api.POST(
        new Request("http://test.local/api/platform", {
          method: "POST",
          headers: {
            origin: "http://test.local",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action, data }),
        }),
      );
    const api = await vite.ssrLoadModule("/app/api/platform/route.ts");
    const worker = await vite.ssrLoadModule("/lib/higgsfield/worker.ts");
    const media = await vite.ssrLoadModule("/app/api/media/route.ts");
    const balance = async () =>
      (await db
        .prepare(
          "SELECT SUM(amount) AS balance FROM credit_transactions WHERE user_id='alice'",
        )
        .first<any>())!.balance;
    const payload = () => ({
      idempotencyKey: crypto.randomUUID(),
      characterId: null,
      reference: null,
      modelId: "higgsfield-soul-2",
      prompt: "A watercolor landscape",
      settings,
    });
    const drain = async () => {
      await Promise.all(runtime.jobs.splice(0));
    };
    const tick = async (id: string) => {
      await db
        .prepare(
          "UPDATE generation_jobs SET lease_until=? WHERE generation_id=?",
        )
        .bind("2000-01-01T00:00:00.000Z", id)
        .run();
      await worker.runGenerationJob(id, "http://test.local");
    };
    try {
      const state = await api.GET(
        new Request("http://test.local/api/platform?action=state"),
      );
      const body = await state.json();
      assert.equal(
        body.account.balance,
        0,
        "New live accounts do not get automatic spendable demo credits",
      );
      assert.equal(body.models.length, 2);
      assert(body.models.every((m: any) => m.provider === "Higgsfield"));
      await db
        .prepare(
          "INSERT INTO credit_transactions(id,user_id,amount,type,description,balance_before,balance_after,idempotency_key) VALUES('fund','alice',1000,'promotion','Test credits',0,1000,'fund')",
        )
        .run();
      const input = payload();
      const start = await post("generate", input);
      assert.equal(start.status, 202);
      const job = await start.json();
      await drain();
      assert.equal(submissions, 1);
      assert.equal(await balance(), 988);
      assert.equal((await post("generate", input)).status, 200);
      await drain();
      assert.equal(submissions, 1);
      assert.equal((await post("cancel", { id: job.id })).status, 409);
      outcome = "completed";
      storageFailure = true;
      await tick(job.id);
      assert.equal(await balance(), 988);
      storageFailure = false;
      await tick(job.id);
      await tick(job.id);
      assert.equal(submissions, 1);
      assert.equal(
        (await db
          .prepare("SELECT status FROM generations WHERE id=?")
          .bind(job.id)
          .first<any>())!.status,
        "completed",
      );
      assert.equal(
        (await db
          .prepare("SELECT COUNT(*) AS n FROM notifications WHERE id=?")
          .bind(`generation:${job.id}`)
          .first<any>())!.n,
        1,
      );
      assert.equal(
        (
          await media.GET(
            new Request(`http://test.local/api/media?id=${job.id}`),
          )
        ).status,
        200,
      );
      runtime.user.userId = "bob";
      assert.equal(
        (
          await media.GET(
            new Request(`http://test.local/api/media?id=${job.id}`),
          )
        ).status,
        404,
      );
      runtime.user.userId = "alice";
      outcome = "failed";
      const second = await (await post("generate", payload())).json();
      await drain();
      await tick(second.id);
      await tick(second.id);
      assert.equal(
        await balance(),
        988,
        "Provider failure refunds exactly once",
      );
      assert.equal(
        (await db
          .prepare(
            "SELECT COUNT(*) AS n FROM credit_transactions WHERE generation_id=? AND type='generation_refund'",
          )
          .bind(second.id)
          .first<any>())!.n,
        1,
      );
      submitFailure = "rejected";
      const third = await (await post("generate", payload())).json();
      await drain();
      await tick(third.id);
      assert.equal(await balance(), 988);
      submitFailure = "timeout";
      const fourth = await (await post("generate", payload())).json();
      await drain();
      const before = submissions;
      await tick(fourth.id);
      assert.equal(
        submissions,
        before,
        "Ambiguous paid POST must not be repeated",
      );
      assert.equal(
        await balance(),
        976,
        "Uncertain job retains credit reservation",
      );
      assert.equal(
        (await db
          .prepare("SELECT status FROM generation_jobs WHERE generation_id=?")
          .bind(fourth.id)
          .first<any>())!.status,
        "needs_review",
      );
      runtime.env.HIGGSFIELD_DAILY_LIMIT_USD = "0.001";
      const capped = await post("generate", payload());
      assert.equal(capped.status, 429);
      assert.equal(
        await balance(),
        976,
        "Budget rejection rolls back both job and credit charge",
      );
      runtime.env.HIGGSFIELD_DAILY_LIMIT_USD = "5";
      submitFailure = "";
      outcome = "completed";
      const video = await (
        await post("generate", { ...payload(), modelId: "higgsfield-kling-3" })
      ).json();
      await drain();
      await tick(video.id);
      const download = await media.GET(
        new Request(`http://test.local/api/media?id=${video.id}&download=1`),
      );
      assert.equal(download.status, 200);
      assert.equal(download.headers.get("content-type"), "video/mp4");
      assert.match(download.headers.get("content-disposition")!, /\.mp4/);
      assert.equal(await balance(), 856);
      const scheduler = await vite.ssrLoadModule("/app/api/jobs/route.ts");
      assert.equal(
        (await scheduler.GET(new Request("http://test.local/api/jobs"))).status,
        401,
      );
      assert.equal(
        (
          await scheduler.GET(
            new Request("http://test.local/api/jobs", {
              headers: { Authorization: "Bearer test-cron-secret" },
            }),
          )
        ).status,
        200,
      );
      const admin = await vite.ssrLoadModule("/app/api/admin/route.ts");
      assert.equal(
        (
          await admin.GET(
            new Request("http://test.local/api/admin?section=integrations"),
          )
        ).status,
        403,
      );
      runtime.user.userId = "admin";
      const adminResponse = await admin.GET(
        new Request("http://test.local/api/admin?section=integrations"),
      );
      assert.equal(adminResponse.status, 200);
      assert(
        (await adminResponse.json()).generationJobs.some(
          (g: any) => g.id === fourth.id && g.state === "uncertain",
        ),
      );
    } finally {
      await drain();
      globalThis.fetch = originalFetch;
      await vite.close();
      await f.close();
      delete (globalThis as any).__modelDropsTest;
    }
  });
}
