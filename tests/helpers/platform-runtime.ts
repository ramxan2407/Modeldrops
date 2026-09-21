// Imported only by the isolated Vite test harness; never by application code.
export const env = (globalThis as any).__modelDropsTest.env;
export const waitUntil = (promise: Promise<unknown>) =>
  (globalThis as any).__modelDropsTest.jobs.push(promise);
export async function getAppUser() {
  return (globalThis as any).__modelDropsTest.user;
}
