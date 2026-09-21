import { createAuthClient } from "@/lib/supabase/client-factory";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfig } from "@/lib/supabase/config";
import { authCookieName } from "@/lib/auth-policy";

export async function proxy(request: NextRequest) {
  const config = supabaseConfig();
  let response = NextResponse.next({ request });
  response.headers.set("Cache-Control", "private, no-store");
  if (
    !config ||
    !request.cookies
      .getAll()
      .some(
        (c) =>
          c.name === authCookieName || c.name.startsWith(authCookieName + "."),
      )
  )
    return response;
  const client = createAuthClient(config, {
    getAll: () => request.cookies.getAll(),
    setAll(values) {
      for (const { name, value } of values) request.cookies.set(name, value);
      response = NextResponse.next({ request });
      for (const { name, value, options } of values)
        response.cookies.set(name, value, options);
      response.headers.set("Cache-Control", "private, no-store");
    },
  });
  try {
    await client.auth.getUser();
  } catch {
    /* Protected routes still verify identity and fail closed. */
  }
  return response;
}
export const config = {
  matcher: [
    "/((?!_next|assets|favicon|signin-with-chatgpt|signout-with-chatgpt|callback|api/auth).*)",
  ],
};
