import test from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./helpers/lora-fixture";
import { postgresFixture } from "./helpers/postgres-fixture";
import { authThrottle } from "../lib/auth-throttle";
import { requestJson, requestText, RequestError } from "../lib/http-body";
import { observedTask, operationsState } from "../lib/operations";

test("request limits count streamed bytes, reject invalid input, and accept valid JSON", async () => {
  const request = (
    body: string | Uint8Array | ReadableStream,
    length?: string,
  ) =>
    new Request("http://test.local", {
      method: "POST",
      body: body as BodyInit,
      duplex: "half",
      headers: length ? { "content-length": length } : {},
    } as RequestInit);
  const rejected = (promise: Promise<unknown>, status: number) =>
    assert.rejects(
      promise,
      (e: unknown) => e instanceof RequestError && e.status === status,
    );
  await rejected(requestText(request("hello", "5000"), 10), 413);
  await rejected(
    requestText(
      request(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new Uint8Array(6));
            controller.enqueue(new Uint8Array(6));
            controller.close();
          },
        }),
        "1",
      ),
      10,
    ),
    413,
  );
  await rejected(requestText(request("🙂🙂"), 7), 413);
  await rejected(requestText(request(new Uint8Array([0xff]))), 400);
  await rejected(
    requestText(new Request("http://test.local", { method: "POST" })),
    400,
  );
  await rejected(requestJson(request("{")), 400);
  assert.deepEqual(await requestJson(request('{"name":"Valentina"}')), {
    name: "Valentina",
  });
});

for (const backend of ["sqlite", "postgres"]) {
  test(`${backend}: auth limit is atomic, private, expires and trusts only the Vercel runtime`, async () => {
    const f =
      backend === "postgres"
        ? await postgresFixture()
        : { ...fixture(), close: async () => {} };
    try {
      const env = {
        DB: f.env.DB,
        VERCEL: "1",
        CRON_SECRET: "test-only-hmac-secret",
      };
      const request = new Request("http://test.local/api/auth/signin", {
        headers: { "x-forwarded-for": "203.0.113.8" },
      });
      const now = 1800000100000;
      const attempts = await Promise.all(
        Array.from({ length: 9 }, () =>
          authThrottle(env, request, "signup", now),
        ),
      );
      assert.equal(attempts.filter((r) => r === null).length, 5);
      assert.equal(attempts.filter((r) => r?.status === 429).length, 4);
      assert((attempts.find((r) => r)?.retryAfter ?? 0) > 0);
      const row = await f.env.DB.prepare(
        "SELECT * FROM auth_rate_limits",
      ).first<{ key: string; attempts: number }>();
      assert.equal(row?.attempts, 5);
      assert.match(row!.key, /^signup:[a-f0-9]{64}$/);
      assert(!row!.key.includes("203.0.113.8"));
      assert.equal(
        await authThrottle(env, request, "signup", now + 600000),
        null,
      );
      assert.equal(await authThrottle(env, request, "signin", now), null);
      assert.equal(
        await authThrottle({ VERCEL: "0" }, request, "signup", now),
        null,
      );
      assert.equal(
        (await authThrottle({ VERCEL: "1" }, request, "signup", now))?.status,
        503,
      );
    } finally {
      await f.close();
    }
  });

  test(`${backend}: operations detects missing, stale, failed and overlapping scheduler runs`, async () => {
    const f =
      backend === "postgres"
        ? await postgresFixture()
        : { ...fixture(), close: async () => {} };
    try {
      const db = f.env.DB;
      assert(
        (await operationsState(db)).checks.every(
          (c) => c.status === "not_seen",
        ),
      );
      assert.equal(await observedTask(db, "generation", async () => 42), 42);
      assert.equal(
        (await operationsState(db)).checks.find((c) => c.name === "generation")
          ?.status,
        "ok",
      );
      await assert.rejects(
        observedTask(db, "email", async () => {
          throw new Error("test failure");
        }),
      );
      assert.equal(
        (await operationsState(db)).checks.find((c) => c.name === "email")
          ?.status,
        "failed",
      );
      assert.equal(
        (await operationsState(db, Date.now() + 360000)).checks.find(
          (c) => c.name === "generation",
        )?.status,
        "stale",
      );
      let release!: () => void, started!: () => void;
      const entered = new Promise<void>((resolve) => {
        started = resolve;
      });
      const paused = new Promise<void>((resolve) => {
        release = resolve;
      });
      const older = observedTask(db, "storage", async () => {
        started();
        await paused;
      });
      await entered;
      await assert.rejects(
        observedTask(db, "storage", async () => {
          throw new Error("newer run failed");
        }),
      );
      release();
      await older;
      assert.equal(
        (await operationsState(db)).checks.find((c) => c.name === "storage")
          ?.status,
        "failed",
        "older completion must not overwrite a newer failure",
      );
      assert.equal((await operationsState(db)).counts.review_jobs, 0);
    } finally {
      await f.close();
    }
  });
}
