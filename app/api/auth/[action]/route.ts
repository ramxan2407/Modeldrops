import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseConfig } from "@/lib/supabase/config";
import {
  authCookieName,
  authDestination,
  isSameOriginAuthRequest,
  loginMethodCookie,
  verifiedSupabaseIdentity,
} from "@/lib/auth-policy";
export const dynamic = "force-dynamic";
const options = (secure: boolean) => ({
  httpOnly: true,
  secure,
  sameSite: "lax" as const,
  path: "/",
});
const reply = (error: string, status: number) =>
  NextResponse.json(
    { error },
    { status, headers: { "Cache-Control": "no-store" } },
  );
const success = (data: unknown) =>
  NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
export async function POST(
  request: Request,
  { params }: { params: Promise<{ action: string }> },
) {
  const { action } = await params;
  if (!isSameOriginAuthRequest(request))
    return reply("Please sign in from Model Drops.", 403);
  if (
    !["signin", "signup", "reset", "password", "google", "signout"].includes(
      action,
    )
  )
    return reply("Not found.", 404);
  const config = supabaseConfig(),
    jar = await cookies();
  if (action === "signout") {
    const client = await supabaseServer();
    if (client) {
      try {
        await client.auth.signOut({ scope: "local" });
      } catch {}
    }
    for (const c of jar.getAll())
      if (c.name.startsWith(authCookieName) || c.name === loginMethodCookie)
        jar.set(c.name, "", {
          ...options(new URL(request.url).protocol === "https:"),
          maxAge: 0,
        });
    return NextResponse.redirect(new URL("/login", request.url), 303);
  }
  if (!config)
    return reply(
      "Sign-in is not available yet. Please check back shortly.",
      503,
    );
  const client = await supabaseServer();
  if (!client) return reply("Sign-in is temporarily unavailable.", 503);
  try {
    if (Number(request.headers.get("content-length") || 0) > 4096)
      return reply("Request too large.", 413);
    const raw = await request.text();
    if (raw.length > 4096) return reply("Request too large.", 413);
    const startFlow = (purpose: string, returnTo: unknown) => {
      const flow = crypto.randomUUID();
      jar.set("md-auth-flow", flow, {
        ...options(config.secure),
        maxAge: 3600,
      });
      jar.set("md-auth-purpose", purpose, {
        ...options(config.secure),
        maxAge: 3600,
      });
      jar.set("md-auth-return", authDestination(returnTo), {
        ...options(config.secure),
        maxAge: 3600,
      });
      return `${config.origin}/auth/complete?flow=${flow}`;
    };
    if (action === "google") {
      if (!config.google)
        return reply("Google sign-in is not available yet.", 503);
      if (
        !request.headers
          .get("content-type")
          ?.startsWith("application/x-www-form-urlencoded")
      )
        return reply("Invalid form.", 415);
      const form = new URLSearchParams(raw);
      const { data, error } = await client.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: startFlow("google", form.get("returnTo")),
          skipBrowserRedirect: true,
        },
      });
      if (error || !data.url)
        return NextResponse.redirect(
          new URL("/login?error=oauth", config.origin),
          303,
        );
      return NextResponse.redirect(data.url, 303);
    }
    if (!request.headers.get("content-type")?.startsWith("application/json"))
      return reply("Invalid request.", 415);
    const data = JSON.parse(raw);
    if (action === "password") {
      const { data: current, error: authError } = await client.auth.getUser();
      if (authError || !verifiedSupabaseIdentity(current.user))
        return reply("Open your password reset email again to continue.", 401);
      const password = z.string().min(12).max(128).parse(data.password);
      const { error } = await client.auth.updateUser({ password });
      if (error)
        return reply(
          "This password could not be saved. Try a different password or request a new reset link.",
          400,
        );
      return success({ returnTo: "/dashboard" });
    }
    const email = z.string().trim().email().max(254).parse(data.email);
    if (action === "reset") {
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: startFlow("recovery", "/dashboard"),
      });
      if (error)
        return reply(
          "Please wait a moment before requesting another reset email.",
          error.status === 429 ? 429 : 400,
        );
      return success({
        message:
          "If an account exists for this email, you will receive a password reset link. Open it in this browser.",
      });
    }
    const password = z
      .string()
      .min(action === "signup" ? 12 : 1)
      .max(128)
      .parse(data.password);
    if (action === "signup") {
      const name = z.string().trim().min(1).max(60).parse(data.name);
      const { data: result, error } = await client.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
          emailRedirectTo: startFlow("signup", data.returnTo),
        },
      });
      if (error)
        return reply(
          error.status === 429
            ? "Please wait before trying again."
            : "Unable to create an account. Check your details or try signing in.",
          error.status === 429 ? 429 : 400,
        );
      if (!result.session || !verifiedSupabaseIdentity(result.user))
        return success({
          message:
            "Check your email to confirm your account. Open the confirmation link in this browser, then sign in.",
        });
    } else {
      const { data: result, error } = await client.auth.signInWithPassword({
        email,
        password,
      });
      if (error || !result.session || !verifiedSupabaseIdentity(result.user))
        return reply(
          "Unable to sign in. Check your email and password, and confirm your email before signing in.",
          401,
        );
    }
    jar.set(loginMethodCookie, "supabase", {
      ...options(config.secure),
      maxAge: 60 * 60 * 24 * 365,
    });
    return success({ returnTo: authDestination(data.returnTo) });
  } catch (e) {
    return reply(
      e instanceof z.ZodError || e instanceof SyntaxError
        ? "Please check all fields. New passwords need 12–128 characters."
        : "Sign-in is temporarily unavailable. Please try again.",
      e instanceof z.ZodError || e instanceof SyntaxError ? 400 : 503,
    );
  }
}
