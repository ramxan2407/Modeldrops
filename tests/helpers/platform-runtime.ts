// Imported only by the isolated Vite test harness; never by application code.
import type { bindings } from "../../lib/server";
export type TestUser = { userId: string; email: string; fullName?: string };
export type TestRuntime = {
  env: ReturnType<typeof bindings>;
  user: TestUser | null;
  jobs: Promise<unknown>[];
};
declare global {
  var __modelDropsTest: TestRuntime | undefined;
}
export const env = globalThis.__modelDropsTest!.env;
export const waitUntil = (promise: Promise<unknown>) =>
  globalThis.__modelDropsTest!.jobs.push(promise);
export async function getAppUser() {
  return globalThis.__modelDropsTest!.user;
}
