import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import { authCookieName } from "../auth-policy";

// Shared by route handlers and the refresh proxy; no browser-side token storage.
export function createAuthClient(
  config: { url: string; key: string; secure: boolean },
  cookies: CookieMethodsServer,
  fetcher: typeof fetch = fetch,
) {
  return createServerClient(config.url, config.key, {
    cookieOptions: {
      name: authCookieName,
      httpOnly: true,
      secure: config.secure,
      sameSite: "lax",
      path: "/",
    },
    global: { fetch: fetcher },
    cookies,
  });
}
