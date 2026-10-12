// Deliberately local-only: real route handlers and provider, isolated persistent DB.
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { mkdir, readFile, writeFile, chmod } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { openLocalDatabase } from "./database.mjs";
import { privateBucket } from "../../lib/vercel/storage.ts";

if (
  process.env.VERCEL ||
  process.env.NODE_ENV === "production" ||
  !process.argv.includes("--confirm-live")
)
  throw Error(
    "Local live testing requires --confirm-live and cannot run in production.",
  );
if (!process.env.WAVESPEED_API_KEY?.trim())
  throw Error("WAVESPEED_API_KEY is required.");
const root = fileURLToPath(new URL("../../", import.meta.url)).replace(
  /\/$/,
  "",
);
const directory = root + "/work/local-live";
await mkdir(directory, { recursive: true, mode: 0o700 });
await chmod(directory, 0o700);
const manifestPath = directory + "/manifest.json";
let manifest;
try {
  manifest = JSON.parse(await readFile(manifestPath, "utf8"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
  manifest = {
    storagePrefix: "local-live/" + randomUUID(),
    providerLimitUsd: 1,
  };
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), {
    mode: 0o600,
    flag: "wx",
  });
}
if (
  manifest.providerLimitUsd !== 1 ||
  !/^local-live\/[a-f0-9-]{36}$/.test(manifest.storagePrefix)
)
  throw Error("Invalid local live workspace manifest.");
const storage = privateBucket();
if (!storage) throw Error("Private storage credentials are required.");
const scopedKey = (key) => {
  if (!key || key.startsWith("/") || key.split("/").includes(".."))
    throw Error("Invalid storage key.");
  return manifest.storagePrefix + "/" + key;
};
const BUCKET = {
  put: (key, ...args) => storage.put(scopedKey(key), ...args),
  get: (key) => storage.get(scopedKey(key)),
  head: (key) => storage.head(scopedKey(key)),
  delete: (keys) =>
    storage.delete((Array.isArray(keys) ? keys : [keys]).map(scopedKey)),
  signedRead: (key) => storage.signedRead(scopedKey(key)),
  createMultipartUpload: (key, ...args) =>
    storage.createMultipartUpload(scopedKey(key), ...args),
  resumeMultipartUpload: (key, id) =>
    storage.resumeMultipartUpload(scopedKey(key), id),
};
const { DB, sql } = openLocalDatabase(directory + "/workspace.sqlite");
await chmod(directory + "/workspace.sqlite", 0o600);
// DATABASE_URL and all other production bindings are intentionally excluded.
const origin = "http://127.0.0.1:4177";
const runtime = {
  env: {
    DB,
    BUCKET,
    APP_ORIGIN: origin,
    DEMO_MODE: "true",
    WELCOME_CREDITS: "0",
    SUPER_ADMIN_USER_IDS: "admin",
    WAVESPEED_API_KEY: process.env.WAVESPEED_API_KEY.trim(),
    WAVESPEED_ENABLED: "true",
    WAVESPEED_DAILY_LIMIT_USD: "1",
    GENERATION_USER_DAILY_LIMIT_USD: "1",
    DEMO_TOTAL_LIMIT_USD: "1",
  },
  user: {
    userId: "admin",
    email: "local-live@example.test",
    fullName: "Local Live Admin",
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
const { initialize } = await backend.ssrLoadModule("/lib/server.ts");
await initialize(runtime.user);
const { AdminService } = await backend.ssrLoadModule("/lib/admin/service.ts");
const admin = new AdminService(DB, runtime.env, "admin");
await admin.mutate("credits", {
  id: "admin",
  amount: 5000,
  key: "5236cebd-870d-4e55-a71e-c50646e98a3e",
  reason: "Initial isolated local live QA demo credits",
});
// Import the saved candidate once; never overwrite later edits or fabricate approvals.
if (
  !sql.prepare("SELECT id FROM character_controls WHERE id='valentina'").get()
) {
  const source = "http://127.0.0.1:4176";
  const headers = { cookie: "local_demo=admin" };
  const catalogResponse = await fetch(
    source + "/api/admin?section=characters",
    {
      headers,
      signal: AbortSignal.timeout(15000),
      redirect: "error",
    },
  );
  if (!catalogResponse.ok)
    throw Error(
      "Start the simulated local demo and save the character portrait first.",
    );
  const catalog = await catalogResponse.json();
  const character = catalog.rows?.find((c) => c.id === "valentina");
  if (!character?.referencePreview?.startsWith("/api/characters/reference?"))
    throw Error(
      "Save a reference portrait in the local demo before starting live testing.",
    );
  const portraitResponse = await fetch(source + character.referencePreview, {
    headers,
    signal: AbortSignal.timeout(15000),
    redirect: "error",
  });
  const mime = portraitResponse.headers.get("content-type")?.split(";")[0];
  if (
    !portraitResponse.ok ||
    !["image/jpeg", "image/png", "image/webp"].includes(mime)
  )
    throw Error("The saved portrait could not be imported.");
  const portrait = Buffer.from(await portraitResponse.arrayBuffer());
  if (
    character.id !== "valentina" ||
    !character.referenceAssetId ||
    character.age < 18 ||
    portrait.length > 10 * 1024 * 1024
  )
    throw Error(
      "A saved adult character with a reference portrait is required.",
    );
  const extension = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  }[mime];
  const key = `private/admin/references/${character.referenceAssetId}.${extension}`;
  await BUCKET.put(key, portrait, { httpMetadata: { contentType: mime } });
  const {
    name,
    description,
    age,
    category,
    demoCreditPrice,
    referenceAssetId,
  } = character;
  await DB.batch([
    DB.prepare(
      "INSERT INTO generation_assets(id,user_id,storage_key,mime,size) VALUES(?,'admin',?,?,?)",
    ).bind(character.referenceAssetId, key, mime, portrait.length),
    DB.prepare(
      "INSERT INTO character_controls(id,price,enabled,featured,profile) VALUES(?,?,1,?,?)",
    ).bind(
      character.id,
      character.price,
      +character.featured,
      JSON.stringify({
        name,
        description,
        age,
        category,
        demoCreditPrice,
        referenceAssetId,
        approvalStatus: "pending",
      }),
    ),
  ]);
  manifest.portraitSha256 = createHash("sha256").update(portrait).digest("hex");
  manifest.referenceAssetId = referenceAssetId;
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), {
    mode: 0o600,
  });
  console.log(
    "Saved character portrait imported into isolated private storage.",
  );
}
const routes = new Map();
for (const path of [
  "platform",
  "admin",
  "characters/checkout",
  "characters/reference",
  "image-models",
  "media",
  "upload",
  "transfers",
  "lora",
  "lora/file",
  "lora/zip",
  "characters/upgrade",
  "catalog",
  "catalog/portrait",
])
  routes.set(
    "/" + path,
    await backend.ssrLoadModule("/app/api/" + path + "/route.ts"),
  );
const worker = await backend.ssrLoadModule("/lib/generation/worker.ts");
let polling;
const timer = setInterval(() => {
  if (polling) return;
  polling = (async () => {
    try {
      await Promise.allSettled(runtime.jobs.splice(0));
      const jobs = await DB.prepare(
        "SELECT generation_id FROM generation_jobs WHERE status='queued' OR (status='processing' AND lease_until<?) LIMIT 3",
      )
        .bind(new Date().toISOString())
        .all();
      for (const job of jobs.results)
        await worker.runGenerationJob(job.generation_id, origin);
    } catch {
      console.error("Local job polling failed; retained for the next attempt.");
    }
  })().finally(() => {
    polling = undefined;
  });
}, 5000);
const server = await createServer({
  configFile: false,
  define: {
    "process.env.NEXT_PUBLIC_SITE_URL": "undefined",
    "import.meta.env.VITE_LOCAL_LIVE": "true",
  },
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
      name: "local-live-routes",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (
            !["127.0.0.1:4177", "localhost:4177"].includes(req.headers.host) ||
            (req.headers.origin &&
              req.headers.origin !== origin &&
              req.headers.origin !== "http://localhost:4177")
          ) {
            res.writeHead(403);
            res.end("Local live workspace only.");
            return;
          }
          next();
        });
        server.middlewares.use("/api/", async (req, res) => {
          try {
            const url = new URL(req.url, origin),
              route = routes.get(url.pathname);
            if (!route?.[req.method]) {
              res.writeHead(404);
              res.end();
              return;
            }
            const chunks = [];
            let size = 0;
            for await (const chunk of req) {
              size += chunk.length;
              if (size > 26 * 1024 * 1024) {
                res.writeHead(413);
                res.end();
                return;
              }
              chunks.push(chunk);
            }
            const request = new Request(origin + "/api" + req.url, {
              method: req.method,
              headers: req.headers,
              ...(chunks.length ? { body: Buffer.concat(chunks) } : {}),
            });
            const result = await route[req.method](request);
            res.writeHead(result.status, Object.fromEntries(result.headers));
            if (result.body)
              for await (const chunk of result.body)
                res.write(Buffer.from(chunk));
            res.end();
          } catch {
            console.error("Local API request failed; no credentials logged.");
            if (!res.headersSent)
              res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Local API request failed." }));
          }
        });
      },
    },
  ],
  server: {
    host: "127.0.0.1",
    port: 4177,
    strictPort: true,
    fs: {
      allow: [root],
      deny: [
        ".env",
        ".env.*",
        "*.{crt,pem}",
        "**/work/**",
        "**/.git/**",
        "**/.vercel/**",
      ],
    },
  },
});
await server.listen();
console.log(
  origin +
    "/studio?character=valentina — REAL generation, isolated demo credits, $1 lifetime provider cap.",
);
async function shutdown() {
  clearInterval(timer);
  await server.close();
  await Promise.allSettled(runtime.jobs.splice(0));
  await polling;
  await backend.close();
  sql.close();
  process.exit(0);
}
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
