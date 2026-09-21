import {
  createHmac,
  timingSafeEqual,
  createHash,
  randomUUID,
} from "node:crypto";
import type { Database } from "./database";
export function verifyStripeSignature(
  raw: string,
  header: string,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
) {
  if (!secret || raw.length > 1_000_000)
    throw new Error("Webhook verification unavailable");
  const parts = header.split(",").map((x) => x.split("="));
  const timestamp = parts.find(([k]) => k === "t")?.[1];
  if (
    !timestamp ||
    !/^\d+$/.test(timestamp) ||
    Math.abs(nowSeconds - Number(timestamp)) > 300
  )
    throw new Error("Invalid or stale Stripe signature");
  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${raw}`)
    .digest();
  const valid = parts
    .filter(([k]) => k === "v1")
    .some(([, signature]) => {
      if (!/^[a-f0-9]{64}$/i.test(signature || "")) return false;
      const candidate = Buffer.from(signature, "hex");
      return (
        candidate.length === expected.length &&
        timingSafeEqual(candidate, expected)
      );
    });
  if (!valid) throw new Error("Invalid Stripe signature");
  return JSON.parse(raw);
}
export async function createCreditCheckout(
  db: Database,
  userId: string,
  packageId: string,
  idempotencyKey: string,
  config: { secretKey: string; appOrigin: string; liveEnabled: boolean },
) {
  if (!config.liveEnabled || !config.secretKey)
    throw new Error("Live payments disabled");
  if (!/^[a-zA-Z0-9-]{16,100}$/.test(idempotencyKey))
    throw new Error("Invalid idempotency key");
  const origin = new URL(config.appOrigin);
  if (origin.protocol !== "https:")
    throw new Error("HTTPS application origin required");
  const p = (
    await db.query("SELECT * FROM credit_packages WHERE id=$1 AND enabled", [
      packageId,
    ])
  ).rows[0];
  if (!p) throw new Error("Package unavailable");
  const key = `checkout:${userId}:${idempotencyKey}`;
  const candidate = randomUUID();
  await db.query(
    `INSERT INTO payments(id,user_id,kind,amount_cents,currency,credits_snapshot,package_id,idempotency_key) VALUES($1,$2,'credits',$3,$4,$5,$6,$7) ON CONFLICT(idempotency_key) DO NOTHING`,
    [candidate, userId, p.price_cents, p.currency, p.credits, p.id, key],
  );
  const payment = (
    await db.query("SELECT * FROM payments WHERE idempotency_key=$1", [key])
  ).rows[0];
  if (payment.user_id !== userId || payment.package_id !== packageId)
    throw new Error("Idempotency key conflict");
  if (payment.status !== "pending")
    throw new Error("Payment already processed");
  const form = new URLSearchParams({
    mode: "payment",
    client_reference_id: payment.id,
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": payment.currency,
    "line_items[0][price_data][unit_amount]": String(payment.amount_cents),
    "line_items[0][price_data][product_data][name]": `${payment.credits_snapshot} Model Drops credits`,
    success_url: `${origin.origin}/billing?checkout=returned`,
    cancel_url: `${origin.origin}/billing`,
  });
  const r = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Idempotency-Key": key,
    },
    body: form,
    signal: AbortSignal.timeout(30000),
  });
  if (!r.ok) throw new Error(`Stripe checkout unavailable (${r.status})`);
  const session = (await r.json()) as { id: string; url: string };
  if (!session.id || !session.url?.startsWith("https://checkout.stripe.com/"))
    throw new Error("Unexpected Stripe checkout response");
  await db.query(
    "UPDATE payments SET stripe_session_id=$1,updated_at=now() WHERE id=$2",
    [session.id, payment.id],
  );
  return { url: session.url };
}
/** Call with the raw body. Never credit a wallet from a frontend redirect. */
export async function processStripeWebhook(
  db: Database,
  raw: string,
  signature: string,
  secret: string,
  expectedLivemode: boolean,
) {
  const event = verifyStripeSignature(raw, signature, secret);
  if (typeof event.id !== "string" || event.livemode !== expectedLivemode)
    throw new Error("Wrong Stripe environment");
  if (
    ![
      "checkout.session.completed",
      "checkout.session.async_payment_succeeded",
    ].includes(event.type)
  )
    return { ignored: true };
  const session = event.data?.object;
  if (session?.payment_status !== "paid" || session.mode !== "payment")
    return { ignored: true };
  return db.transaction(async (tx) => {
    const inserted = await tx.query(
      "INSERT INTO webhooks(provider,external_id,payload_hash) VALUES('stripe',$1,$2) ON CONFLICT(provider,external_id) DO NOTHING RETURNING id",
      [event.id, createHash("sha256").update(raw).digest("hex")],
    );
    if (!inserted.rows.length) return { duplicate: true };
    const payment = (
      await tx.query(
        "SELECT * FROM payments WHERE stripe_session_id=$1 FOR UPDATE",
        [session.id],
      )
    ).rows[0];
    if (!payment)
      throw new Error(
        "Payment is not registered; retry webhook after checkout persistence",
      );
    if (payment.kind !== "credits")
      throw new Error("Dedicated marketplace fulfillment required");
    if (
      Number(payment.amount_cents) !== session.amount_total ||
      payment.currency !== session.currency ||
      payment.id !== session.client_reference_id
    )
      throw new Error("Checkout does not match payment snapshot");
    if (payment.status === "pending") {
      await tx.query(
        "SELECT post_credit_entry($1,$2,'purchase',$3,$4,NULL,$5)",
        [
          payment.user_id,
          payment.credits_snapshot,
          "Credit purchase",
          `payment:${payment.id}`,
          payment.id,
        ],
      );
      await tx.query(
        "UPDATE payments SET status='paid',stripe_payment_intent_id=$1,updated_at=now() WHERE id=$2",
        [session.payment_intent, payment.id],
      );
    } else if (payment.status !== "paid")
      throw new Error("Payment requires reconciliation");
    await tx.query(
      "UPDATE webhooks SET status='processed',processed_at=now() WHERE provider='stripe' AND external_id=$1",
      [event.id],
    );
    return { processed: true };
  });
}
export function splitMarketplaceSale(
  grossCents: number,
  taxCents: number,
  platformFeeBps: number,
  reserveBps: number,
) {
  for (const v of [grossCents, taxCents, platformFeeBps, reserveBps])
    if (!Number.isSafeInteger(v) || v < 0)
      throw new Error("Invalid sale split");
  if (taxCents > grossCents || platformFeeBps > 10000 || reserveBps > 10000)
    throw new Error("Invalid sale split");
  const net = grossCents - taxCents;
  const platformFeeCents = Math.floor((net * platformFeeBps) / 10000),
    sellerNetCents = net - platformFeeCents,
    reserveCents = Math.floor((sellerNetCents * reserveBps) / 10000);
  return {
    grossCents,
    taxCents,
    platformFeeCents,
    sellerNetCents,
    reserveCents,
    pendingCents: sellerNetCents - reserveCents,
  };
}
