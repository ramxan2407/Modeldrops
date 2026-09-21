import { postgresFixture } from "./helpers/postgres-fixture";
import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import { fixture, png } from "./helpers/lora-fixture";
const root = fileURLToPath(new URL("../", import.meta.url));
const shim = fileURLToPath(
  new URL("./helpers/platform-runtime.ts", import.meta.url),
);
for (const backend of ["sqlite", "postgres"]) {
  const f =
    backend === "postgres"
      ? await postgresFixture()
      : { ...fixture(), close: async () => {} };
  const runtime = {
    env: { ...f.env, SUPER_ADMIN_USER_IDS: "admin" },
    user: null as any,
    jobs: [] as Promise<unknown>[],
  };
  (globalThis as any).__modelDropsTest = runtime;
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
  const api = await vite.ssrLoadModule("/app/api/platform/route.ts");
  const admin = await vite.ssrLoadModule("/app/api/admin/route.ts");
  const media = await vite.ssrLoadModule("/app/api/media/route.ts");
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(png as any, { headers: { "Content-Type": "image/png" } });
  const who = (id: string | null) =>
    (runtime.user = id
      ? { userId: id, email: id + "@example.test", fullName: id }
      : null);
  const post = async (action: string, data: any) =>
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
  const state = async () => {
    const r = await api.GET(
      new Request("http://test.local/api/platform?action=state"),
    );
    assert.equal(r.status, 200);
    return r.json();
  };
  try {
    await test(
      backend +
        ": " +
        "current platform routes isolate identities, claims, favorites and projects",
      async () => {
        who(null);
        assert.equal(
          (
            await api.GET(
              new Request("http://test.local/api/platform?action=state"),
            )
          ).status,
          401,
        );
        who("alice");
        assert.equal((await state()).account.balance, 1840);
        assert.equal(
          (
            await post("claim", {
              characterId: "nova",
              acceptedLicense: true,
              userId: "bob",
            })
          ).status,
          200,
        );
        assert.equal(
          (await post("claim", { characterId: "nova", acceptedLicense: true }))
            .status,
          200,
        );
        await post("favorite", { characterId: "nova" });
        await post("project", { name: "Private QA project" });
        const a: any = await state();
        assert.deepEqual(a.account.owned, ["nova"]);
        assert.equal(a.account.projects.length, 1);
        assert.equal(a.account.purchases.length, 1);
        who("bob");
        const b: any = await state();
        assert.deepEqual(b.account.owned, []);
        assert.deepEqual(b.account.favorites, []);
        assert.deepEqual(b.account.projects, []);
        assert.equal(
          (
            await post("settings", {
              name: "Bob updated",
              defaultPrivate: true,
            })
          ).status,
          200,
        );
        assert.equal((await state()).account.name, "Bob updated");
      },
    );
    await test(
      backend +
        ": " +
        "current generation routes charge once, enforce ownership and refund once",
      async () => {
        const payload = {
          idempotencyKey: crypto.randomUUID(),
          characterId: "nova",
          modelId: "forma-image",
          prompt: "QA portrait",
          settings: {
            ratio: "1:1",
            resolution: "1024",
            outputs: 1,
            negative: "",
            seed: null,
            duration: 5,
          },
        };
        who("bob");
        assert.equal((await post("generate", payload)).status, 403);
        who("alice");
        const r = await post("generate", payload);
        assert.equal(r.status, 202);
        const job: any = await r.json();
        assert.equal((await post("generate", payload)).status, 200);
        assert.equal((await state()).account.balance, 1828);
        assert.equal(
          (await post("generate", { ...payload, prompt: "Different prompt" }))
            .status,
          409,
        );
        who("bob");
        assert.equal((await post("cancel", { id: job.id })).status, 404);
        assert.equal(
          (
            await media.GET(
              new Request("http://test.local/api/media?id=" + job.id),
            )
          ).status,
          404,
        );
        who("alice");
        assert.equal((await post("cancel", { id: job.id })).status, 200);
        assert.equal((await post("cancel", { id: job.id })).status, 200);
        assert.equal((await state()).account.balance, 1840);
        assert.equal(
          (await f.env.DB.prepare(
            "SELECT COUNT(*) n FROM credit_transactions WHERE type='generation_refund'",
          ).first<{ n: number }>())!.n,
          1,
        );
      },
    );
    await test(
      backend +
        ": " +
        "super admin API denies ordinary accounts and enforces suspension across private APIs",
      async () => {
        who("alice");
        assert.equal(
          (
            await admin.GET(
              new Request("http://test.local/api/admin?section=users"),
            )
          ).status,
          403,
        );
        who("admin");
        const r = await admin.GET(
          new Request("http://test.local/api/admin?section=users"),
        );
        assert.equal(r.status, 200);
        const mutate = (action: string, data: any) =>
          admin.POST(
            new Request("http://test.local/api/admin", {
              method: "POST",
              headers: {
                origin: "http://test.local",
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ action, data }),
            }),
          );
        assert.equal(
          (
            await mutate("user", {
              id: "alice",
              suspended: true,
              reason: "QA suspension check",
            })
          ).status,
          200,
        );
        who("alice");
        assert.equal(
          (
            await api.GET(
              new Request("http://test.local/api/platform?action=state"),
            )
          ).status,
          403,
        );
        assert.equal(
          (
            await media.GET(
              new Request("http://test.local/api/media?id=anything"),
            )
          ).status,
          403,
        );
        who("admin");
        assert.equal(
          (
            await mutate("user", {
              id: "alice",
              suspended: false,
              reason: "QA access restored",
            })
          ).status,
          200,
        );
        assert.equal(
          (
            await mutate("character", {
              id: "nova",
              enabled: false,
              featured: false,
              price: 24,
              reason: "QA disabled character",
            })
          ).status,
          200,
        );
        who("bob");
        assert.equal(
          (await post("claim", { characterId: "nova", acceptedLicense: true }))
            .status,
          404,
        );
      },
    );
    await test(
      backend +
        ": " +
        "all workspace mutations reject missing and foreign origins; payments fail without charging",
      async () => {
        who("alice");
        for (const origin of [undefined, "https://foreign.test"]) {
          const headers: any = { "Content-Type": "application/json" };
          if (origin) headers.origin = origin;
          assert.equal(
            (
              await api.POST(
                new Request("http://test.local/api/platform", {
                  method: "POST",
                  headers,
                  body: JSON.stringify({
                    action: "settings",
                    data: { name: "Intruder", defaultPrivate: true },
                  }),
                }),
              )
            ).status,
            403,
          );
        }
        const before = (await state()).account.balance;
        assert.equal(
          (await post("checkout", { packageId: "starter" })).status,
          503,
        );
        assert.equal((await state()).account.balance, before);
      },
    );
    if (backend === "postgres")
      await test("postgres: direct uploads are owner-bound, target-bound and single-use", async () => {
        const transfers = await vite.ssrLoadModule(
          "/app/api/transfers/route.ts",
        );
        const upload = await vite.ssrLoadModule("/app/api/upload/route.ts");
        let storageKey = "";
        (runtime.env.BUCKET as any).signedUpload = async (key: string) => {
          storageKey = key;
          return "https://storage.example.test/signed";
        };
        who("alice");
        const start = await transfers.POST(
          new Request("http://test.local/api/transfers", {
            method: "POST",
            headers: {
              origin: "http://test.local",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ target: "/api/upload", size: png.length }),
          }),
        );
        assert.equal(start.status, 200);
        const transfer = await start.json();
        f.objects.set(storageKey, png);
        const send = (suffix = "") =>
          upload.POST(
            new Request("http://test.local/api/upload" + suffix, {
              method: "POST",
              headers: {
                origin: "http://test.local",
                "x-upload-transfer": transfer.id,
              },
            }),
          );
        who("bob");
        assert.equal((await send()).status, 404);
        who("alice");
        assert.equal((await send("?wrong=target")).status, 404);
        assert.equal((await send()).status, 201);
        assert.equal((await send()).status, 404);
        assert.equal(f.objects.has(storageKey), false);
      });
  } finally {
    await Promise.allSettled(runtime.jobs);
    globalThis.fetch = originalFetch;
    await vite.close();
    delete (globalThis as any).__modelDropsTest;
  }

  await f.close();
}
