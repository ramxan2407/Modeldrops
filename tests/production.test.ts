import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID, createHmac } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import {
  calculateCredits,
  priceForMargin,
  generationSettings,
} from "../lib/pricing";
import {
  verifyStripeSignature,
  processStripeWebhook,
  splitMarketplaceSale,
} from "../production/services/payments";
import {
  enqueueGeneration,
  refundGeneration,
  validateParameters,
} from "../production/services/generations";
import { WaveSpeedProvider } from "../production/providers/wavespeed";
import { OpenRouterProvider } from "../production/providers/openrouter";
import type { Database } from "../production/services/database";
const secret = "whsec_local_test_only";
function signed(event: unknown, time = Math.floor(Date.now() / 1000)) {
  const raw = JSON.stringify(event);
  return {
    raw,
    signature: `t=${time},v1=${createHmac("sha256", secret).update(`${time}.${raw}`).digest("hex")}`,
  };
}
const pg = new PGlite({ extensions: { pgcrypto } });
await pg.exec(
  await readFile(
    new URL("../production/migrations/001_platform.sql", import.meta.url),
    "utf8",
  ),
);
const db: Database = {
  query: async (s, p) => pg.query(s, p),
  transaction: async (callback) =>
    pg.transaction(async (tx) =>
      callback({ query: async (s, p) => tx.query(s, p) }),
    ),
};
const user = randomUUID(),
  provider = randomUUID(),
  model = randomUUID();
await pg.query("INSERT INTO users(id,email) VALUES($1,'test@example.test')", [
  user,
]);
await pg.query("INSERT INTO credit_wallets(user_id) VALUES($1)", [user]);
await pg.query(
  "SELECT post_credit_entry($1,100,'promotion','test seed','welcome-test')",
  [user],
);
await pg.query(
  "INSERT INTO ai_providers(id,name,adapter,secret_env_key,enabled) VALUES($1,'test','test','TEST_KEY',true)",
  [provider],
);
await pg.query(
  "INSERT INTO ai_models(id,provider_id,provider_model_id,display_name,generation_type,enabled,parameters_schema) VALUES($1,$2,'test/image','Test Image','image',true,$3)",
  [
    model,
    provider,
    JSON.stringify({
      type: "object",
      properties: { outputs: { type: "integer", enum: [1, 2, 4] } },
      required: ["outputs"],
    }),
  ],
);
await pg.query(
  "INSERT INTO model_pricing(model_id,version,provider_cost_usd,fixed_credits,credit_value_usd,minimum_credits,multipliers) VALUES($1,1,0.04,12,0.01,5,$2)",
  [model, JSON.stringify({ outputs: { "1": 1, "2": 2, "4": 4 } })],
);
await test("PostgreSQL baseline creates all 45+ required entities", async () => {
  const r = await pg.query<{ n: number }>(
    "SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'",
  );
  assert.ok(r.rows[0].n >= 45);
});
await test("Credit pricing uses gross margin, not markup", () => {
  assert.equal(priceForMargin(4, 0.6, 1, 1), 10);
  assert.equal(priceForMargin(4, 0.6, 1, 15), 15);
  assert.throws(() => priceForMargin(4, 1, 1, 1));
});
await test("Duration, resolution, output count determine cost", () => {
  const s = generationSettings.parse({
    ratio: "16:9",
    resolution: "1080",
    outputs: 2,
    negative: "",
    seed: null,
    duration: 10,
  });
  assert.equal(calculateCredits(36, "video", s), 288);
});
await test("Ledger retries are idempotent", async () => {
  await pg.query(
    "SELECT post_credit_entry($1,100,'promotion','test seed','welcome-test')",
    [user],
  );
  const b = await pg.query<{ balance: number }>(
    "SELECT balance FROM credit_wallets WHERE user_id=$1",
    [user],
  );
  assert.equal(Number(b.rows[0].balance), 100);
});
await test("Ledger payload mismatch rejected", async () => {
  await assert.rejects(
    pg.query(
      "SELECT post_credit_entry($1,200,'promotion','test','welcome-test')",
      [user],
    ),
    /payload conflict/,
  );
});
await test("Credit ledger cannot be edited", async () => {
  await assert.rejects(
    pg.query("UPDATE credit_transactions SET amount=9 WHERE user_id=$1", [
      user,
    ]),
    /Immutable record/,
  );
});
await test("Credit ledger cannot be deleted", async () => {
  await assert.rejects(
    pg.query("DELETE FROM credit_transactions WHERE user_id=$1", [user]),
    /Immutable record/,
  );
});
await test("Wallet cannot be overdrawn", async () => {
  await assert.rejects(
    pg.query(
      "SELECT post_credit_entry($1,-101,'generation_charge','test','overdraft')",
      [user],
    ),
    /Insufficient credits/,
  );
});
const input = {
  modelId: model,
  characterId: null,
  prompt: "Test creation",
  parameters: { outputs: 1 },
  idempotencyKey: randomUUID(),
};
let generationId: string;
await test("Enqueue atomically reserves credits and creates a durable job", async () => {
  const r = await enqueueGeneration(db, user, input);
  generationId = r.id;
  const b = await pg.query<any>(
    "SELECT balance FROM credit_wallets WHERE user_id=$1",
    [user],
  );
  assert.equal(Number(b.rows[0].balance), 88);
  const j = await pg.query(
    "SELECT id FROM generation_jobs WHERE generation_id=$1",
    [r.id],
  );
  assert.equal(j.rows.length, 1);
});
await test("Generation retry cannot charge twice", async () => {
  const r = await enqueueGeneration(db, user, input);
  assert.equal(r.id, generationId);
  const b = await pg.query<any>(
    "SELECT balance FROM credit_wallets WHERE user_id=$1",
    [user],
  );
  assert.equal(Number(b.rows[0].balance), 88);
});
await test("Generation idempotency binds to request payload", async () => {
  await assert.rejects(
    enqueueGeneration(db, user, { ...input, prompt: "Changed prompt" }),
    /different input/,
  );
});
await test("Character ownership and compatibility are enforced", async () => {
  await assert.rejects(
    enqueueGeneration(db, user, {
      ...input,
      characterId: randomUUID(),
      idempotencyKey: randomUUID(),
    }),
    /Character access/,
  );
});
await test("Registry schema rejects undeclared controls", () => {
  assert.throws(
    () =>
      validateParameters(
        { secret_url: "x" },
        { type: "object", properties: {} },
      ),
    /Unsupported parameter/,
  );
});
await test("Generation refunds are idempotent", async () => {
  await db.transaction((tx) =>
    refundGeneration(tx, generationId, "test_cancel"),
  );
  await db.transaction((tx) =>
    refundGeneration(tx, generationId, "test_cancel"),
  );
  const b = await pg.query<any>(
    "SELECT balance FROM credit_wallets WHERE user_id=$1",
    [user],
  );
  assert.equal(Number(b.rows[0].balance), 100);
});
await test("Wallet projection reconciles against immutable ledger", async () => {
  assert.equal(
    (await pg.query("SELECT * FROM wallet_reconciliation")).rows.length,
    0,
  );
});
await test("Stripe signature validates the exact raw body", () => {
  const s = signed({ id: "evt_test", livemode: false });
  assert.equal(
    verifyStripeSignature(s.raw, s.signature, secret).id,
    "evt_test",
  );
  assert.throws(
    () => verifyStripeSignature(s.raw + " ", s.signature, secret),
    /Invalid Stripe signature/,
  );
});
await test("Stale Stripe events are rejected", () => {
  const s = signed({ id: "evt_old" }, 1);
  assert.throws(
    () => verifyStripeSignature(s.raw, s.signature, secret),
    /stale/,
  );
});
const payment = randomUUID();
await pg.query(
  "INSERT INTO payments(id,user_id,kind,amount_cents,currency,credits_snapshot,stripe_session_id,idempotency_key) VALUES($1,$2,'credits',1000,'usd',1000,'cs_local','payment-local')",
  [payment, user],
);
const event = {
  id: "evt_payment",
  livemode: false,
  type: "checkout.session.completed",
  data: {
    object: {
      id: "cs_local",
      mode: "payment",
      payment_status: "paid",
      amount_total: 1000,
      currency: "usd",
      client_reference_id: payment,
      payment_intent: "pi_local",
    },
  },
};
await test("Paid Stripe event credits the snapshotted amount", async () => {
  const s = signed(event);
  await processStripeWebhook(db, s.raw, s.signature, secret, false);
  const b = await pg.query<any>(
    "SELECT balance FROM credit_wallets WHERE user_id=$1",
    [user],
  );
  assert.equal(Number(b.rows[0].balance), 1100);
});
await test("Repeated Stripe event does not duplicate payment", async () => {
  const s = signed(event);
  assert.deepEqual(
    await processStripeWebhook(db, s.raw, s.signature, secret, false),
    { duplicate: true },
  );
  const b = await pg.query<any>(
    "SELECT balance FROM credit_wallets WHERE user_id=$1",
    [user],
  );
  assert.equal(Number(b.rows[0].balance), 1100);
});
await test("Separate success events for one payment also do not double-credit", async () => {
  const s = signed({
    ...event,
    id: "evt_second",
    type: "checkout.session.async_payment_succeeded",
  });
  await processStripeWebhook(db, s.raw, s.signature, secret, false);
  const b = await pg.query<any>(
    "SELECT balance FROM credit_wallets WHERE user_id=$1",
    [user],
  );
  assert.equal(Number(b.rows[0].balance), 1100);
});
await test("Payment amount mismatch rolls back webhook processing", async () => {
  const s = signed({
    ...event,
    id: "evt_bad",
    data: { object: { ...event.data.object, amount_total: 1 } },
  });
  await assert.rejects(
    processStripeWebhook(db, s.raw, s.signature, secret, false),
    /snapshot/,
  );
  assert.equal(
    (await pg.query("SELECT id FROM webhooks WHERE external_id='evt_bad'")).rows
      .length,
    0,
  );
});
await test("Wrong live/test environment is rejected", async () => {
  const s = signed(event);
  await assert.rejects(
    processStripeWebhook(db, s.raw, s.signature, secret, true),
    /environment/,
  );
});
await test("Seller split snapshots tax, fees and reserves", () => {
  assert.deepEqual(splitMarketplaceSale(1200, 200, 2000, 1000), {
    grossCents: 1200,
    taxCents: 200,
    platformFeeCents: 200,
    sellerNetCents: 800,
    reserveCents: 80,
    pendingCents: 720,
  });
});
await test("WaveSpeed normalizes provider statuses without exposing credentials", () => {
  const p = new WaveSpeedProvider("test");
  assert.equal(
    p.normalizeResponse({ code: 200, data: { id: "job", status: "timeout" } })
      .status,
    "failed",
  );
  assert.equal(
    p.normalizeResponse({ code: 200, data: { id: "job", status: "created" } })
      .status,
    "queued",
  );
});
await test("OpenRouter rejects executable SVG output", () => {
  const p = new OpenRouterProvider("test");
  assert.throws(
    () =>
      p.normalizeResponse({
        data: [{ b64_json: "test", media_type: "image/svg+xml" }],
      }),
    /Unsupported/,
  );
});
await pg.close();
