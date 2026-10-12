type AuthLimitEnvironment = {
  VERCEL?: string;
  DB?: D1Database;
  CRON_SECRET?: string;
};

/** Vercel overwrites x-forwarded-for. Do not trust this header on arbitrary hosts. */
export async function authThrottle(
  env: AuthLimitEnvironment,
  request: Request,
  action: string,
  now = Date.now(),
) {
  if (env.VERCEL !== "1") return null;
  if (!env.DB || !env.CRON_SECRET) return { status: 503, retryAfter: 60 };
  const windowMs = 600000;
  const start = Math.floor(now / windowMs) * windowMs;
  const limit = action === "reset" || action === "signup" ? 5 : 30;
  const ip = request.headers.get("x-forwarded-for")?.trim() || "unknown";
  const bytes = new TextEncoder();
  const secret = await crypto.subtle.importKey(
    "raw",
    bytes.encode(env.CRON_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    secret,
    bytes.encode(`model-drops:auth:v1:${ip}`),
  );
  const digest = Array.from(new Uint8Array(signature), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
  const result = await env.DB.prepare(
    "INSERT INTO auth_rate_limits(key,window_start,attempts) VALUES(?,?,1) ON CONFLICT(key) DO UPDATE SET window_start=excluded.window_start,attempts=CASE WHEN auth_rate_limits.window_start<excluded.window_start THEN 1 ELSE auth_rate_limits.attempts+1 END WHERE auth_rate_limits.window_start<excluded.window_start OR auth_rate_limits.attempts<?",
  )
    .bind(`${action}:${digest}`, start, limit)
    .run();
  return result.meta.changes
    ? null
    : {
        status: 429,
        retryAfter: Math.max(1, Math.ceil((start + windowMs - now) / 1000)),
      };
}
