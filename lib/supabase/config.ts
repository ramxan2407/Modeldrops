import { env } from "cloudflare:workers";
export function supabaseConfig() {
  const values = env as unknown as Record<string, string | undefined>;
  const url = values.SUPABASE_URL;
  const key = values.SUPABASE_PUBLISHABLE_KEY;
  const origin = values.APP_ORIGIN;
  if (!url || !key || !origin) return null;
  try {
    const endpoint = new URL(url),
      app = new URL(origin);
    if (
      endpoint.protocol !== "https:" ||
      endpoint.username ||
      endpoint.password ||
      endpoint.pathname !== "/" ||
      endpoint.search ||
      endpoint.hash
    )
      return null;
    if (
      app.protocol !== "https:" &&
      !(
        app.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(app.hostname)
      )
    )
      return null;
    if (
      app.username ||
      app.password ||
      app.pathname !== "/" ||
      app.search ||
      app.hash ||
      !key.startsWith("sb_publishable_")
    )
      return null;
    return {
      url: endpoint.origin,
      key,
      origin: app.origin,
      secure: app.protocol === "https:",
      google: values.SUPABASE_GOOGLE_ENABLED === "true",
    };
  } catch {
    return null;
  }
}
