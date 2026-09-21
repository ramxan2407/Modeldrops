import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseConfig } from "@/lib/supabase/config";
import {
  authDestination,
  loginMethodCookie,
  verifiedSupabaseIdentity,
} from "@/lib/auth-policy";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const url = new URL(request.url),
    config = supabaseConfig(),
    jar = await cookies();
  const failure = () =>
    NextResponse.redirect(
      new URL("/login?switch=1&error=oauth", config?.origin || url.origin),
      303,
    );
  const flow = url.searchParams.get("flow"),
    code = url.searchParams.get("code");
  if (
    !config ||
    !flow ||
    flow !== jar.get("md-auth-flow")?.value ||
    !code ||
    code.length > 2048
  )
    return failure();
  const destination =
    jar.get("md-auth-purpose")?.value === "recovery"
      ? "/auth/update-password"
      : authDestination(jar.get("md-auth-return")?.value);
  jar.delete("md-auth-flow");
  jar.delete("md-auth-return");
  jar.delete("md-auth-purpose");
  try {
    const client = await supabaseServer();
    if (!client) return failure();
    const { data, error } = await client.auth.exchangeCodeForSession(code);
    if (error || !data.session || !verifiedSupabaseIdentity(data.user))
      return failure();
    jar.set(loginMethodCookie, "supabase", {
      httpOnly: true,
      secure: config.secure,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    return NextResponse.redirect(new URL(destination, config.origin), 303);
  } catch {
    return failure();
  }
}
