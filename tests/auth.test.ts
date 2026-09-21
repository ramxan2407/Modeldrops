import test from "node:test";
import assert from "node:assert/strict";
import { createAuthClient } from "../lib/supabase/client-factory";
import {
  verifiedSupabaseIdentity,
  isSameOriginAuthRequest,
} from "../lib/auth-policy";
const user = {
  id: "218e3e88-3949-4690-8b67-aa6ad8a0f999",
  aud: "authenticated",
  role: "authenticated",
  email: "creator@example.test",
  email_confirmed_at: "2026-09-20T00:00:00Z",
  user_metadata: { full_name: "Test Creator" },
  app_metadata: { provider: "email" },
  created_at: "2026-09-20T00:00:00Z",
};
test("Supabase identities are stable by user ID and never merged by email", () => {
  assert.equal(verifiedSupabaseIdentity(user)?.userId, "supabase:" + user.id);
  assert.equal(
    verifiedSupabaseIdentity({ ...user, email: "new@example.test" })?.userId,
    "supabase:" + user.id,
  );
  assert.notEqual(
    verifiedSupabaseIdentity({
      ...user,
      id: "318e3e88-3949-4690-8b67-aa6ad8a0f999",
    })?.userId,
    verifiedSupabaseIdentity(user)?.userId,
  );
});
test("Unconfirmed, absent, or malformed identities fail closed", () => {
  assert.equal(verifiedSupabaseIdentity(null), null);
  assert.equal(
    verifiedSupabaseIdentity({ ...user, email_confirmed_at: undefined }),
    null,
  );
  assert.equal(verifiedSupabaseIdentity({ ...user, id: "local_seedy" }), null);
});
test("Authentication writes require an exact Origin header", () => {
  for (const origin of [
    undefined,
    "https://evil.test",
    "null",
    "https://modeldrops.test.evil.test",
  ]) {
    assert.equal(
      isSameOriginAuthRequest(
        new Request("https://modeldrops.test/api/auth/signin", {
          headers: origin ? { Origin: origin } : {},
        }),
      ),
      false,
    );
  }
  assert.equal(
    isSameOriginAuthRequest(
      new Request("https://modeldrops.test/api/auth/signin", {
        headers: { Origin: "https://modeldrops.test" },
      }),
    ),
    true,
  );
});
test("Official SDK stores secure HttpOnly cookies and revalidates identity remotely", async () => {
  const jar = new Map<string, { value: string; options: any }>();
  const calls: string[] = [];
  const jwt =
    [
      { alg: "HS256", typ: "JWT" },
      {
        sub: user.id,
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        aud: "authenticated",
        role: "authenticated",
      },
    ]
      .map((x) => Buffer.from(JSON.stringify(x)).toString("base64url"))
      .join(".") + ".dGVzdA";
  let revoked = false;
  const fetcher = (async (
    input: string | URL | Request,
    init?: RequestInit,
  ) => {
    const url = String(input);
    calls.push(url);
    if (url.endsWith("/token?grant_type=password")) {
      const body = JSON.parse(String(init?.body));
      if (body.password !== "correct-test-password")
        return Response.json(
          { msg: "Invalid login credentials", code: "invalid_credentials" },
          { status: 400 },
        );
      return Response.json({
        access_token: jwt,
        refresh_token: "test-refresh-token",
        token_type: "bearer",
        expires_in: 3600,
        user,
      });
    }
    if (url.endsWith("/user"))
      return revoked
        ? Response.json(
            { msg: "Invalid JWT", code: "bad_jwt" },
            { status: 401 },
          )
        : Response.json(user);
    throw new Error("Unexpected test request " + url);
  }) as typeof fetch;
  const config = {
    url: "https://auth.example.test",
    key: "sb_publishable_test",
    secure: true,
  };
  const cookieAdapter = {
    getAll: () => [...jar].map(([name, c]) => ({ name, value: c.value })),
    setAll: (values: any[]) => {
      for (const c of values) jar.set(c.name, c);
    },
  };
  const client = createAuthClient(config, cookieAdapter, fetcher);
  assert.ok(
    (
      await client.auth.signInWithPassword({
        email: user.email,
        password: "wrong-password",
      })
    ).error,
  );
  assert.equal(
    (
      await client.auth.signInWithPassword({
        email: user.email,
        password: "correct-test-password",
      })
    ).error,
    null,
  );
  assert.ok(jar.size);
  for (const c of jar.values()) {
    assert.equal(c.options.httpOnly, true);
    assert.equal(c.options.secure, true);
    assert.equal(c.options.sameSite, "lax");
  }
  const returning = createAuthClient(config, cookieAdapter, fetcher);
  assert.equal((await returning.auth.getUser()).data.user?.id, user.id);
  assert.ok(calls.some((url) => url.endsWith("/user")));
  revoked = true;
  assert.ok((await returning.auth.getUser()).error);
});
