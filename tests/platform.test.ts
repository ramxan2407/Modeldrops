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
              characterId: "valentina",
              acceptedLicense: true,
              userId: "bob",
            })
          ).status,
          200,
        );
        assert.equal(
          (
            await post("claim", {
              characterId: "valentina",
              acceptedLicense: true,
            })
          ).status,
          200,
        );
        await post("favorite", { characterId: "valentina" });
        await post("project", { name: "Private QA project" });
        const a: any = await state();
        assert.deepEqual(a.account.owned, ["valentina"]);
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
          characterId: "valentina",
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
              id: "valentina",
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
          (
            await post("claim", {
              characterId: "valentina",
              acceptedLicense: true,
            })
          ).status,
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
    await test(
      backend +
        ": character restrictions are enforced by catalog, claims and favorites",
      async () => {
        await f.env.DB.prepare(
          "UPDATE character_controls SET enabled=1 WHERE id=?",
        )
          .bind("valentina")
          .run();
        who("alice");
        await f.env.DB.prepare(
          "INSERT INTO character_permissions(user_id,character_id,can_view,can_generate) VALUES(?,?,0,0)",
        )
          .bind("alice", "valentina")
          .run();
        assert.equal(
          (await state()).characters.some((c: any) => c.id === "valentina"),
          false,
        );
        assert.equal(
          (
            await post("claim", {
              characterId: "valentina",
              acceptedLicense: true,
            })
          ).status,
          404,
        );
        assert.equal(
          (await post("favorite", { characterId: "valentina" })).status,
          404,
        );
        await f.env.DB.prepare(
          "UPDATE character_permissions SET can_view=1 WHERE user_id=? AND character_id=?",
        )
          .bind("alice", "valentina")
          .run();
        const balance = (await state()).account.balance;
        assert.equal(
          (
            await post("generate", {
              idempotencyKey: crypto.randomUUID(),
              characterId: "valentina",
              modelId: "forma-image",
              prompt: "Permission check",
              settings: {
                ratio: "1:1",
                resolution: "1024",
                outputs: 1,
                negative: "",
                seed: null,
                duration: 5,
              },
            })
          ).status,
          403,
        );
        assert.equal((await state()).account.balance, balance);
        who("bob");
        assert.equal(
          (await state()).characters.some((c: any) => c.id === "valentina"),
          true,
        );
      },
    );

    await test(
      backend +
        ": test checkout is idempotent, owned and disabled in production",
      async () => {
        const checkoutApi = await vite.ssrLoadModule(
          "/app/api/characters/checkout/route.ts",
        );
        who("alice");
        assert.equal(
          (
            await checkoutApi.POST(
              new Request("http://test.local/api/characters/checkout", {
                method: "POST",
                headers: {
                  origin: "https://other.test",
                  "Content-Type": "application/json",
                },
                body: "{}",
              }),
            )
          ).status,
          403,
        );
        who(null);
        assert.equal(
          (
            await checkoutApi.GET(
              new Request("http://test.local/api/characters/checkout?id=sora"),
            )
          ).status,
          401,
        );
        who("alice");
        const { CharacterCheckout } = await vite.ssrLoadModule(
          "/lib/characters/checkout.ts",
        );
        const { characterAccess } = await vite.ssrLoadModule(
          "/lib/characters/access.ts",
        );
        const { AdminService } = await vite.ssrLoadModule(
          "/lib/admin/service.ts",
        );
        const svc = new AdminService(
          f.env.DB,
          { SUPER_ADMIN_USER_IDS: "admin" },
          "admin",
        );
        const characterId = "sora";
        const referenceId = crypto.randomUUID();
        await f.env.DB.prepare(
          "INSERT INTO generation_assets(id,user_id,storage_key,mime,size) VALUES(?,'admin','private/admin/character.png','image/png',100)",
        )
          .bind(referenceId)
          .run();
        const profile = {
          name: "Sora",
          age: 26,
          category: "Editorial",
          description: "Fictional adult character",
          referenceAssetId: referenceId,
        };
        await assert.rejects(
          new AdminService(
            f.env.DB,
            { SUPER_ADMIN_USER_IDS: "admin" },
            "alice",
          ).mutate("character", {
            id: characterId,
            price: 29,
            enabled: true,
            featured: false,
            profile,
            reason: "Approve reference portrait",
          }),
        );
        await assert.rejects(
          svc.mutate("character", {
            id: characterId,
            price: 29,
            enabled: true,
            featured: false,
            profile: { ...profile, referenceAssetId: crypto.randomUUID() },
            reason: "Reject foreign asset",
          }),
        );
        await svc.mutate("character", {
          id: characterId,
          price: 29,
          enabled: true,
          featured: false,
          profile,
          reason: "Approve reference portrait",
        });
        const testEnv = {
          CHARACTER_TEST_CHECKOUT: "true",
          VERCEL_ENV: "preview",
        };
        const service = new CharacterCheckout(f.env.DB, "alice", testEnv);
        const order = {
          characterId,
          expectedAmountCents: 2900,
          acceptedLicense: true,
          idempotencyKey: crypto.randomUUID(),
        };
        assert.equal((await service.quote(characterId)).ready, true);
        await assert.rejects(
          new CharacterCheckout(f.env.DB, "alice", {}).complete(order),
          /Payments are not connected/,
        );
        await assert.rejects(
          new CharacterCheckout(f.env.DB, "alice", {
            ...testEnv,
            VERCEL_ENV: "production",
          }).complete(order),
          /Payments are not connected/,
        );
        await assert.rejects(
          service.complete({ ...order, expectedAmountCents: 1 }),
          /price changed/,
        );
        const [first, second] = await Promise.all([
          service.complete(order),
          service.complete(order),
        ]);
        assert.equal(first.id, second.id);
        const refs = await vite.ssrLoadModule("/lib/generation/characters.ts");
        (runtime.env as any).CHARACTER_TEST_CHECKOUT = "true";
        (runtime.env as any).VERCEL_ENV = "preview";
        (runtime.env.BUCKET as any).signedRead = async () =>
          "https://example.com/approved-sora.png";
        assert.deepEqual(
          await refs.characterReferenceInputs(
            f.env.DB,
            "alice",
            characterId,
            "wavespeed-kling-3",
            { image: "https://example.com/forged.png" },
            "https://modeldrops.example",
          ),
          { image: "https://example.com/approved-sora.png" },
        );
        assert((await state()).account.usableCharacters.includes(characterId));
        delete (runtime.env as any).CHARACTER_TEST_CHECKOUT;
        delete (runtime.env as any).VERCEL_ENV;

        assert.equal(
          await characterAccess(f.env.DB, "alice", characterId, testEnv),
          true,
        );
        assert.equal(
          await characterAccess(f.env.DB, "bob", characterId, testEnv),
          false,
        );
        assert.equal(
          await characterAccess(f.env.DB, "alice", characterId, {
            ...testEnv,
            VERCEL_ENV: "production",
          }),
          false,
        );
        await assert.rejects(
          service.complete({ ...order, characterId: "scarlett" }),
          /another order/,
        );
        await assert.rejects(
          service.complete({ ...order, idempotencyKey: crypto.randomUUID() }),
          /already in your library/,
        );
        assert.equal(
          (
            await f.env.DB.prepare(
              "SELECT COUNT(*) n FROM character_orders",
            ).first<any>()
          ).n,
          1,
        );
        // A revoked entitlement is authoritative even when a legacy paid receipt exists.
        await f.env.DB.prepare(
          "INSERT INTO character_purchases(id,user_id,character_id,price_cents,license_version,license_snapshot) VALUES(?,'alice',?,2900,'paid-1','Legacy receipt')",
        )
          .bind(crypto.randomUUID(), characterId)
          .run();
        await f.env.DB.prepare(
          "UPDATE character_entitlements SET status='revoked' WHERE user_id='alice' AND character_id=?",
        )
          .bind(characterId)
          .run();
        const balanceBefore = (await state()).account.balance;
        assert.equal(
          await characterAccess(f.env.DB, "alice", characterId, testEnv),
          false,
        );
        assert(!(await state()).account.usableCharacters.includes(characterId));
        for (const idempotencyKey of [
          order.idempotencyKey,
          crypto.randomUUID(),
        ]) {
          await assert.rejects(
            service.complete({ ...order, idempotencyKey }),
            /no longer active/,
          );
        }
        assert.equal(
          (
            await f.env.DB.prepare(
              "SELECT COUNT(*) n FROM character_orders",
            ).first<any>()
          ).n,
          1,
        );
        assert.equal((await state()).account.balance, balanceBefore);
      },
    );
  } finally {
    await Promise.allSettled(runtime.jobs);
    globalThis.fetch = originalFetch;
    await vite.close();
    delete (globalThis as any).__modelDropsTest;
  }

  await f.close();
}
