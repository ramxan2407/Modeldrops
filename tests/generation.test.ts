import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import { fixture, png } from "./helpers/lora-fixture";
import { postgresFixture } from "./helpers/postgres-fixture";
import {
  generationModels,
  providerReserve,
  generationInput,
  generationEnabled,
} from "../lib/generation/models";
import { downloadOutput } from "../lib/generation/media";
import { WaveSpeedClient, RejectedSubmission } from "../lib/generation/client";
import { calculateCredits } from "../lib/pricing";
const root = fileURLToPath(new URL("../", import.meta.url));
const settings = {
  ratio: "custom",
  resolution: "custom",
  outputs: 1,
  negative: "",
  seed: null,
  duration: 5,
  providerInputs: { image: "https://example.com/reference.png" },
} as const;
const videoSettings = {
  ...settings,
  ratio: "1:1",
  resolution: "standard",
  providerInputs: undefined,
} as const;
await test("output ingestion rejects foreign hosts, redirects, excessive sizes and MIME spoofing", async () => {
  const env = {};
  for (const url of [
    "http://static.wavespeed.ai/file",
    "https://127.0.0.1/file",
    "https://static.wavespeed.ai.evil.test/x",
    "https://name:pass@static.wavespeed.ai/x",
  ])
    await assert.rejects(
      downloadOutput(url, "image", env, async () => {
        throw new Error("Must not fetch");
      }),
    );
  await assert.rejects(
    downloadOutput(
      "https://static.wavespeed.ai/x",
      "image",
      env,
      async () =>
        new Response("<html>", { headers: { "Content-Type": "image/png" } }),
    ),
  );
  await assert.rejects(
    downloadOutput(
      "https://static.wavespeed.ai/x",
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
    "https://static.wavespeed.ai/x",
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
  await test(`${backend}: live WaveSpeed jobs preserve credit, ownership and submission invariants`, async () => {
    const f =
      backend === "postgres"
        ? await postgresFixture()
        : { ...fixture(), close: async () => {} };
    const runtime = {
      env: {
        ...f.env,
        WAVESPEED_API_KEY: "test-key",
        WAVESPEED_ENABLED: "true",
        WAVESPEED_DAILY_LIMIT_USD: "5",
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
      storageFailure = false,
      quotePrice = 0.02,
      quoteFailure = false;
    const videoRequests = new Set<string>();
    const batchSizes = new Map<string, number>();
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
      if (address.startsWith("https://static.wavespeed.ai/video"))
        return new Response(
          new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112, 105, 115, 111, 109]),
          { headers: { "Content-Type": "video/mp4" } },
        );
      if (address.startsWith("https://static.wavespeed.ai")) {
        if (storageFailure) throw new Error("Temporary download outage");
        return new Response(png, { headers: { "Content-Type": "image/png" } });
      }
      assert.match(address, /^https:\/\/api.wavespeed.ai\//);
      assert.equal((options?.headers as any).Authorization, "Bearer test-key");
      if (address.endsWith("/model/price"))
        return quoteFailure
          ? new Response("{}", { status: 500 })
          : Response.json({
              code: 200,
              data: {
                model_id: JSON.parse(options!.body as string).model_id,
                price: quotePrice,
                discounted_price: quotePrice,
                currency: "USD",
              },
            });
      if (options?.method === "POST") {
        submissions++;
        if (submitFailure === "timeout")
          throw new Error("Timeout after acceptance");
        if (submitFailure === "rejected")
          return new Response("{}", { status: 403 });
        const request_id = crypto.randomUUID().replaceAll("-", "");
        batchSizes.set(
          request_id,
          JSON.parse(options!.body as string).num_images || 1,
        );
        if (address.includes("kling-v3.0")) videoRequests.add(request_id);
        return Response.json({
          code: 200,
          data: { id: request_id, status: "created", outputs: [] },
        });
      }
      const request_id = address.split("/").at(-2);
      return Response.json({
        code: 200,
        data: {
          id: request_id,
          status: outcome,
          outputs:
            outcome === "completed"
              ? videoRequests.has(request_id!)
                ? ["https://static.wavespeed.ai/video/output.mp4"]
                : Array.from(
                    { length: batchSizes.get(request_id!) || 1 },
                    (_, index) =>
                      `https://static.wavespeed.ai/output-${index}.png`,
                  )
              : [],
        },
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
    const worker = await vite.ssrLoadModule("/lib/generation/worker.ts");
    const media = await vite.ssrLoadModule("/app/api/media/route.ts");
    const imageApi = await vite.ssrLoadModule("/app/api/image-models/route.ts");
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
      modelId: "wavespeed-qwen-image-edit",
      expectedCredits: 12,
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
      assert.equal(body.models.length, generationModels.length);
      assert(body.models.every((m: any) => m.provider === "WaveSpeed"));
      await db
        .prepare(
          "INSERT INTO credit_transactions(id,user_id,amount,type,description,balance_before,balance_after,idempotency_key) VALUES('fund','alice',1000,'promotion','Test credits',0,1000,'fund')",
        )
        .run();
      // Prices are server-derived, and a failed/stale quote must not spend credits.
      quotePrice = 0.04;
      assert.equal((await post("generate", payload())).status, 409);
      assert.equal(await balance(), 1000);
      quotePrice = 0.02;
      quoteFailure = true;
      assert.equal((await post("generate", payload())).status, 422);
      quoteFailure = false;
      assert.equal(
        (await post("generate", { ...payload(), expectedCredits: undefined }))
          .status,
        400,
      );
      assert.equal(submissions, 0);
      const referenceId = "00000000-0000-4000-8000-000000000001";
      await db
        .prepare(
          "INSERT INTO generation_assets(id,user_id,storage_key,mime,size) VALUES(?,'alice','private/alice/reference.png','image/png',100)",
        )
        .bind(referenceId)
        .run();
      (runtime.env.BUCKET as any).signedRead = async (key: string) => {
        assert.equal(key, "private/alice/reference.png");
        return "https://private-storage.example.com/reference.png?signature=test";
      };
      const quoteRequest = () =>
        new Request("http://test.local/api/image-models", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Origin: "http://test.local",
          },
          body: JSON.stringify({
            modelId: "wavespeed-qwen-image-edit",
            prompt: "Edit the background",
            inputs: { image: `asset:${referenceId}` },
          }),
        });
      const quoted = await imageApi.POST(quoteRequest());
      assert.equal(quoted.status, 200);
      assert.equal((await quoted.json()).credits, 12);
      runtime.user.userId = "bob";
      assert.equal(
        (await imageApi.POST(quoteRequest())).status,
        403,
        "Another account cannot quote a private reference",
      );
      runtime.user.userId = "alice";
      const input = {
        ...payload(),
        settings: {
          ...settings,
          providerInputs: { image: `asset:${referenceId}` },
        },
      };
      const start = await post("generate", input);
      assert.equal(start.status, 202);
      const job = await start.json();
      const persistedInput = await db
        .prepare(
          "SELECT input_json,endpoint FROM provider_requests WHERE generation_id=?",
        )
        .bind(job.id)
        .first<any>();
      assert.equal(persistedInput.endpoint, "wavespeed-ai/qwen-image/edit");
      assert.match(
        JSON.parse(persistedInput.input_json).image,
        /^https:\/\/private-storage\.example\.com\//,
      );
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
      runtime.env.WAVESPEED_DAILY_LIMIT_USD = "0.001";
      const capped = await post("generate", payload());
      assert.equal(capped.status, 429);
      assert.equal(
        await balance(),
        976,
        "Budget rejection rolls back both job and credit charge",
      );
      runtime.env.WAVESPEED_DAILY_LIMIT_USD = "5";
      submitFailure = "";
      outcome = "completed";
      const video = await (
        await post("generate", {
          ...payload(),
          modelId: "wavespeed-kling-3",
          settings: videoSettings,
        })
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
      // Legacy batch fixture: existing multi-output delivery survives even though Qwen is single-output.
      assert.equal(
        (
          await post("generate", {
            ...payload(),
            settings: { ...settings, outputs: 4 },
          })
        ).status,
        400,
      );
      const batch = { id: crypto.randomUUID() };
      await db
        .prepare(
          "INSERT INTO ai_models(id,name,provider,type,credits,enabled,config) VALUES('wavespeed-legacy-batch','Previous batch model','WaveSpeed','image',12,0,'{}')",
        )
        .run();
      await db
        .prepare(
          "INSERT INTO generations(id,user_id,model_id,prompt,settings,type,cost,idempotency_key,updated_at) VALUES(?,'alice','wavespeed-legacy-batch','Existing batch',?,'image',48,?,?)",
        )
        .bind(
          batch.id,
          JSON.stringify({ ...settings, outputs: 4 }),
          batch.id,
          new Date().toISOString(),
        )
        .run();
      await db
        .prepare("INSERT INTO generation_jobs(id,generation_id) VALUES(?,?)")
        .bind(batch.id, batch.id)
        .run();
      await db
        .prepare(
          "INSERT INTO provider_requests(generation_id,endpoint,input_json,request_id,state,reserved_microusd,created_at,updated_at) VALUES(?,'legacy/batch',?,?,'polling',12000,?,?)",
        )
        .bind(
          batch.id,
          JSON.stringify({ num_images: 4 }),
          `batch_${batch.id}`,
          new Date().toISOString(),
          new Date().toISOString(),
        )
        .run();
      const creditBeforeBatch = await balance();
      await db
        .prepare(
          "INSERT INTO credit_transactions(id,user_id,amount,type,description,balance_before,balance_after,idempotency_key,generation_id) VALUES(?,'alice',-48,'generation_charge','Existing batch',?,?,?,?)",
        )
        .bind(
          `charge-${batch.id}`,
          creditBeforeBatch,
          creditBeforeBatch - 48,
          `charge-${batch.id}`,
          batch.id,
        )
        .run();
      batchSizes.set(`batch_${batch.id}`, 4);
      const submittedBeforeDelivery = submissions;
      await tick(batch.id);
      assert.equal(
        (
          await media.GET(
            new Request(
              `http://test.local/api/media?id=${batch.id}&asset=${batch.id}`,
            ),
          )
        ).status,
        404,
        "Partial batch is not published",
      );
      storageFailure = true;
      await tick(batch.id);
      storageFailure = false;
      for (let i = 0; i < 4; i++) await tick(batch.id);
      assert.equal(
        submissions,
        submittedBeforeDelivery,
        "Batch retry never submits again",
      );
      assert.equal(
        await balance(),
        808,
        "Four images cost four times the single-image price",
      );
      const batchState = await (
        await api.GET(
          new Request("http://test.local/api/platform?action=state"),
        )
      ).json();
      const delivered = batchState.account.generations.find(
        (g: any) => g.id === batch.id,
      );
      assert.equal(delivered.status, "completed");
      assert.equal(delivered.outputs.length, 4);
      for (const output of delivered.outputs) {
        assert.equal(
          (
            await media.GET(
              new Request(`http://test.local${output.url}&download=1`),
            )
          ).status,
          200,
        );
        assert.equal(
          (
            await media.GET(
              new Request(
                `http://test.local/api/media?id=${job.id}&asset=${encodeURIComponent(output.id)}`,
              ),
            )
          ).status,
          404,
          "Asset must belong to the requested generation",
        );
      }
      runtime.user.userId = "bob";
      assert.equal(
        (
          await media.GET(
            new Request(`http://test.local${delivered.outputs[3].url}`),
          )
        ).status,
        404,
      );
      runtime.user.userId = "alice";
      assert.deepEqual(
        batchState.models.find((m: any) => m.id === "wavespeed-kling-3")
          .resolutions,
        ["standard"],
      );
      // Historical models are neither advertised nor rerouted into WaveSpeed.
      await db
        .prepare(
          "INSERT INTO ai_models(id,name,provider,type,credits,enabled,config) VALUES('retired-image','Retired image','Higgsfield','image',12,1,?)",
        )
        .bind(
          JSON.stringify({
            id: "retired-image",
            ratios: ["1:1"],
            resolutions: ["720"],
          }),
        )
        .run();
      assert.equal(
        (await post("generate", { ...payload(), modelId: "retired-image" }))
          .status,
        503,
      );
      const beforeRetired = submissions;
      for (const state of ["ready", "polling", "submitting"]) {
        const id = `retired-${state}`;
        await db
          .prepare(
            "INSERT INTO generations(id,user_id,model_id,prompt,settings,type,cost,idempotency_key,updated_at) VALUES(?,'alice','retired-image','Legacy test',?,'image',12,?,?)",
          )
          .bind(id, JSON.stringify(settings), id, new Date().toISOString())
          .run();
        await db
          .prepare("INSERT INTO generation_jobs(id,generation_id) VALUES(?,?)")
          .bind(id, id)
          .run();
        await db
          .prepare(
            "INSERT INTO provider_requests(generation_id,endpoint,input_json,request_id,state,reserved_microusd,created_at,updated_at) VALUES(?,'old/endpoint','{}',?,?,3200,?,?)",
          )
          .bind(
            id,
            state === "polling" ? "old-provider-id" : null,
            state,
            new Date().toISOString(),
            new Date().toISOString(),
          )
          .run();
        const credit = await balance();
        await db
          .prepare(
            "INSERT INTO credit_transactions(id,user_id,amount,type,description,balance_before,balance_after,idempotency_key,generation_id) VALUES(?,'alice',-12,'generation_charge','Legacy test',?,?,?,?)",
          )
          .bind(`charge-${id}`, credit, credit - 12, `charge-${id}`, id)
          .run();
        await tick(id);
        await tick(id);
        const retired = await db
          .prepare("SELECT status FROM generation_jobs WHERE generation_id=?")
          .bind(id)
          .first<any>();
        assert.equal(
          retired!.status,
          state === "ready" ? "cancelled" : "needs_review",
        );
        assert.equal(await balance(), state === "ready" ? credit : credit - 12);
      }
      assert.equal(
        submissions,
        beforeRetired,
        "Retired provider requests are never sent to WaveSpeed",
      );
      runtime.env.WAVESPEED_API_KEY = "";
      const disconnected = await (
        await api.GET(
          new Request("http://test.local/api/platform?action=state"),
        )
      ).json();
      assert(
        disconnected.models.every(
          (m: any) => m.provider === "WaveSpeed" && !m.enabled,
        ),
      );
      assert.equal((await post("generate", payload())).status, 503);
      runtime.env.WAVESPEED_API_KEY = "test-key";
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

await test("WaveSpeed input mapping covers sizes, formats, batches, audio pricing and storyboards", () => {
  assert(
    generationEnabled({ WAVESPEED_ENABLED: "true", WAVESPEED_API_KEY: "test" }),
  );
  assert(!generationEnabled({ WAVESPEED_ENABLED: "true" }));
  assert(
    !generationEnabled({
      WAVESPEED_ENABLED: "true",
      WAVESPEED_API_KEY: "bad key",
    }),
  );
  const custom = generationInput("wavespeed-qwen-image-edit", "test", {
    ...settings,
    providerInputs: {
      image: "https://example.com/reference.png",
      size: "1280*720",
      output_format: "png",
      seed: 0,
    },
  });
  assert.equal(custom.size, "1280*720");
  assert.equal(custom.output_format, "png");
  assert.equal(custom.seed, 0);
  assert.equal(custom.enable_sync_mode, false);
  for (const duration of [3, 15]) {
    const config = {
      ...videoSettings,
      duration,
      sound: true,
      cfgScale: 0.71,
      shotType: "customize" as const,
      negative: "blurry",
      shots: [
        { prompt: "Opening", duration: 1 },
        { prompt: "Closing", duration: duration - 1 },
      ],
    };
    const result = generationInput("wavespeed-kling-3", "test", config);
    assert("duration" in result);
    assert.equal(result.duration, duration);
    assert.equal(result.sound, true);
    assert.equal(result.shot_type, "customize");
    assert.equal(result.negative_prompt, "blurry");
    assert.equal((result.multi_prompt as unknown[])?.length, 2);
    assert.equal(
      providerReserve("wavespeed-kling-3", config),
      duration * 126000,
    );
    assert.equal(
      calculateCredits(120, "video", config),
      Math.ceil(((120 * duration) / 5) * 1.5),
    );
  }
  for (const patch of [
    { duration: 16 },
    { cfgScale: 1.1 },
    { resolution: "720" as const },
    {
      shotType: "intelligence" as const,
      shots: [{ prompt: "Shot", duration: 5 }],
    },
    { shots: [{ prompt: "Shot", duration: 3 }] },
  ])
    assert.throws(() =>
      generationInput("wavespeed-kling-3", "test", {
        ...videoSettings,
        ...patch,
      }),
    );
  for (const patch of [
    { width: 255, height: 1024 },
    { width: 1537, height: 1024 },
    { styleId: "11111111-1111-4111-8111-111111111111" },
    { enhancePrompt: true },
    { negative: "unavailable" },
  ])
    assert.throws(() =>
      generationInput("wavespeed-qwen-image-edit", "test", {
        ...settings,
        ...patch,
      }),
    );
  assert.throws(() =>
    generationInput("wavespeed-qwen-image-edit", "test", settings, "character"),
  );
});
await test("verified WaveSpeed CDN output is accepted without forwarding API credentials",async()=>{
  const result=await downloadOutput('https://d2h7xmz5gqybh9.cloudfront.net/output/image.png','image',{},async(_url,options)=>{
    assert.equal(options?.headers,undefined);
    assert.equal(options?.redirect,'error');
    return new Response(png,{headers:{'Content-Type':'image/png'}});
  });
  assert.equal(result.mime,'image/png');
  await assert.rejects(()=>downloadOutput('https://another-distribution.cloudfront.net/output/image.png','image',{}),/host/);
});
await test("WaveSpeed protocol distinguishes rejections, uncertain submissions and terminal failures", async () => {
  const env = { WAVESPEED_API_KEY: "test-key" };
  for (const status of [400, 401, 402, 403, 404, 422, 429])
    await assert.rejects(
      new WaveSpeedClient(
        env,
        async () => new Response("{}", { status }),
      ).submit("model/endpoint", {}),
      RejectedSubmission,
    );
  for (const status of [408, 500, 502])
    await assert.rejects(
      new WaveSpeedClient(
        env,
        async () => new Response("{}", { status }),
      ).submit("model/endpoint", {}),
      (error) => !(error instanceof RejectedSubmission),
    );
  for (const status of [
    "failed",
    "timeout",
    "deleted",
    "cancelled",
    "completed",
    "processing",
    "created",
  ]) {
    const client = new WaveSpeedClient(env, async () =>
      Response.json({
        code: 200,
        data: { id: "pred_abc", status, outputs: [] },
      }),
    );
    assert.equal(
      (await client.status("pred_abc")).status,
      status === "completed"
        ? "completed"
        : status === "cancelled"
          ? "cancelled"
          : ["failed", "timeout", "deleted"].includes(status)
            ? "failed"
            : "processing",
    );
  }
  await assert.rejects(
    new WaveSpeedClient(env, async () =>
      Response.json({
        code: 200,
        data: { id: "another", status: "completed", outputs: [] },
      }),
    ).status("pred_abc"),
  );
  await assert.rejects(
    new WaveSpeedClient(env, async () =>
      Response.json({ code: 200, data: { status: "created" } }),
    ).submit("model/endpoint", {}),
  );
});
