import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { readFile } from "node:fs/promises";
import { fixture } from "../../tests/helpers/lora-fixture.ts";
if (process.env.VERCEL || process.env.NODE_ENV === "production")
  throw new Error("The isolated QA server cannot run in production.");
const root = process.cwd(),
  f = fixture();
const runtime = {
  env: {
    ...f.env,
    DEMO_MODE: "true",
    DEMO_WELCOME_CREDITS: "2000",
    APP_ORIGIN: "http://127.0.0.1:4176",
    SUPER_ADMIN_USER_IDS: "admin",
    WAVESPEED_API_KEY: "mock-key",
    WAVESPEED_ENABLED: "true",
    WAVESPEED_DAILY_LIMIT_USD: "100",
  },
  user: {
    userId: "alice",
    email: "alice@example.test",
    fullName: "Demo Creator",
  },
  jobs: [],
};
globalThis.__modelDropsTest = runtime;
const shim = root + "/tests/helpers/platform-runtime.ts";
const backend = await createServer({
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
const routes = new Map();
for (const p of [
  "platform",
  "admin",
  "characters/checkout",
  "characters/reference",
  "image-models",
  "media",
  "upload",
  "lora",
])
  routes.set(
    "/" + p,
    await backend.ssrLoadModule("/app/api/" + p + "/route.ts"),
  );
const worker = await backend.ssrLoadModule("/lib/generation/worker.ts");
const portrait = await readFile(root + "/public/assets/hero.png");
const video = await readFile(
  root + "/public/assets/campaigns/coastal-dusk-mobile.mp4",
);
for (const [i, id] of ["valentina", "isla"].entries()) {
  const assetId = `00000000-0000-4000-8000-00000000000${i + 1}`;
  await f.env.DB.prepare(
    "INSERT INTO generation_assets(id,user_id,storage_key,mime,size) VALUES(?,?,?,?,?)",
  )
    .bind(
      assetId,
      "admin",
      `private/admin/${id}.png`,
      "image/png",
      portrait.length,
    )
    .run();
  await f.env.BUCKET.put(`private/admin/${id}.png`, portrait);
  await f.env.DB.prepare(
    "INSERT INTO character_controls(id,price,enabled,featured,profile) VALUES(?,29,1,0,?)",
  )
    .bind(
      id,
      JSON.stringify({
        name: id === "valentina" ? "Valentina" : "Isla",
        description:
          "Fictional adult demo character with a local sample portrait.",
        age: 28,
        category: "Editorial",
        referenceAssetId: assetId,
        approvalStatus: id === "valentina" ? "approved" : "pending",
        demoCreditPrice: 300,
      }),
    )
    .run();
}
f.env.BUCKET.signedRead = async (key) =>
  "https://private-storage.example.com/" + key;
const kinds = new Map();
globalThis.fetch = async (url, init) => {
  const u = String(url);
  if (u.startsWith("https://static.wavespeed.ai/"))
    return new Response(u.endsWith(".mp4") ? video : portrait, {
      headers: {
        "Content-Type": u.endsWith(".mp4") ? "video/mp4" : "image/png",
      },
    });
  if (!u.startsWith("https://api.wavespeed.ai/"))
    throw Error("External traffic disabled in local demo harness");
  if (u.endsWith("/model/price"))
    return Response.json({
      code: 200,
      data: {
        model_id: JSON.parse(init.body).model_id,
        price: 0.02,
        discounted_price: 0.02,
        currency: "USD",
      },
    });
  if (init?.method === "POST") {
    const id = crypto.randomUUID().replaceAll("-", "");
    kinds.set(id, u.includes("kling") ? "mp4" : "png");
    return Response.json({
      code: 200,
      data: { id, status: "created", outputs: [] },
    });
  }
  const id = u.split("/").at(-2);
  return Response.json({
    code: 200,
    data: {
      id,
      status: "completed",
      outputs: ["https://static.wavespeed.ai/output." + kinds.get(id)],
    },
  });
};
const server = await createServer({
  configFile: false,
  define: { "process.env.NEXT_PUBLIC_SITE_URL": "undefined" },
  root: root + "/tests/demo-ui",
  publicDir: root + "/public",
  resolve: {
    alias: {
      "@": root,
      "next/link": root + "/tests/demo-ui/link.tsx",
      "next/navigation": root + "/tests/demo-ui/navigation.ts",
    },
  },
  css: { postcss: root },
  plugins: [
    react(),
    {
      name: "isolated-real-routes",
      configureServer(server) {
        server.middlewares.use("/api/", async (req, res) => {
          try {
            const url = new URL(req.url, "http://127.0.0.1:4176");
            if (url.pathname === "/demo-account") {
              const user = ["admin", "bob"].includes(url.searchParams.get("id"))
                ? url.searchParams.get("id")
                : "alice";
              res.setHeader(
                "Set-Cookie",
                `local_demo=${user}; Path=/; HttpOnly; SameSite=Lax`,
              );
              res.writeHead(302, {
                Location: user === "admin" ? "/admin" : "/marketplace",
              });
              res.end();
              return;
            }
            const actor =
              /local_demo=(admin|alice|bob)/.exec(
                req.headers.cookie || "",
              )?.[1] || "alice";
            runtime.user = {
              userId: actor,
              email: actor + "@example.test",
              fullName:
                actor === "admin"
                  ? "Demo Admin"
                  : actor === "bob"
                    ? "Second Creator"
                    : "Demo Creator",
            };
            const route = routes.get(url.pathname);
            if (!route?.[req.method]) {
              res.writeHead(404);
              res.end();
              return;
            }
            let bytes = [];
            for await (const chunk of req) bytes.push(chunk);
            const request = new Request("http://127.0.0.1:4176/api" + req.url, {
              method: req.method,
              headers: req.headers,
              ...(bytes.length ? { body: Buffer.concat(bytes) } : {}),
            });
            const result = await route[req.method](request);
            res.writeHead(result.status, Object.fromEntries(result.headers));
            res.end(Buffer.from(await result.arrayBuffer()));
            await Promise.allSettled(runtime.jobs.splice(0));
            const pending = await f.env.DB.prepare(
              "SELECT generation_id FROM generation_jobs WHERE status='processing'",
            ).all();
            for (const job of pending.results) {
              await f.env.DB.prepare(
                "UPDATE generation_jobs SET lease_until=? WHERE generation_id=?",
              )
                .bind("2000-01-01", job.generation_id)
                .run();
              await worker.runGenerationJob(
                job.generation_id,
                "http://127.0.0.1:4176",
              );
            }
          } catch (e) {
            console.error(e.message);
            if (!res.headersSent) {
              res.writeHead(500, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: e.message }));
            }
          }
        });
      },
    },
  ],
  server: {
    host: "127.0.0.1",
    port: 4176,
    strictPort: true,
    fs: { allow: [root] },
  },
});
await server.listen();
console.log(
  "Isolated local demo: http://127.0.0.1:4176/marketplace (all generation simulated)",
);
