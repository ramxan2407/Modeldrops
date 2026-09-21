import { readFile } from "node:fs/promises";
import path from "node:path";
import { after } from "next/server";
import { createPostgresDatabase } from "./postgres";
import { privateBucket } from "./storage";
let db: ReturnType<typeof createPostgresDatabase> | undefined;
// Native Next builds replace cloudflare:workers with this server-only module.
// The existing Sites/Vinext build retains its actual D1 and R2 bindings.
export const env = new Proxy({} as Record<string, unknown>, {
  get(_target, name: string) {
    if (name === "DB") {
      if (!process.env.DATABASE_URL) return undefined;
      return (db ??= createPostgresDatabase(process.env.DATABASE_URL));
    }
    if (name === "DEMO_ASSET")
      return async () =>
        new Uint8Array(
          await readFile(path.join(process.cwd(), "public/assets/hero.png")),
        ).buffer;
    if (name === "BUCKET") return privateBucket();
    if (name === "APP_ORIGIN")
      return (
        process.env.APP_ORIGIN ||
        (process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : undefined)
      );
    return process.env[name];
  },
});
export function waitUntil(promise: Promise<unknown>) {
  after(() => promise.then(() => undefined));
}
