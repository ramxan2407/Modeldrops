import type { LoraBindings } from "./service";
// Durable outbox. A scheduler should POST /api/lora/email every minute.
// Stop ambiguous retries after 23 hours, inside Resend's 24-hour deduplication window.
export async function deliverTrainingEmails(
  env: LoraBindings,
  fetcher: typeof fetch = fetch,
) {
  if (!env.RESEND_API_KEY || !env.LORA_EMAIL_FROM)
    return { configured: false, sent: 0 };
  const now = Date.now();
  await env.DB.prepare(
    "UPDATE training_emails SET status='failed',last_error='Delivery window expired; inspect provider logs before any manual resend.' WHERE status IN ('pending','sending') AND first_attempt_at IS NOT NULL AND first_attempt_at<? AND lease_until<?",
  )
    .bind(now - 23 * 3600000, now)
    .run();
  const rows = await env.DB.prepare(
    "SELECT * FROM training_emails WHERE status IN ('pending','sending') AND lease_until<? ORDER BY created_at LIMIT 10",
  )
    .bind(now)
    .all<{
      id: string;
      recipient: string;
      subject: string;
      body: string;
      attempts: number;
    }>();
  let sent = 0;
  for (const row of rows.results) {
    const claim = await env.DB.prepare(
      "UPDATE training_emails SET status='sending',lease_until=?,attempts=attempts+1,first_attempt_at=COALESCE(first_attempt_at,?) WHERE id=? AND status IN ('pending','sending') AND lease_until<?",
    )
      .bind(Date.now() + 120000, Date.now(), row.id, Date.now())
      .run();
    if (!claim.meta.changes) continue;
    try {
      const response = await fetcher("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `lora-email/${row.id}`,
        },
        body: JSON.stringify({
          from: env.LORA_EMAIL_FROM,
          to: [row.recipient],
          subject: row.subject,
          text: row.body,
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok)
        throw new Error(`Email provider returned HTTP ${response.status}.`);
      const result = (await response.json()) as { id?: string };
      if (!result.id)
        throw new Error("Email provider did not return a receipt.");
      await env.DB.prepare(
        "UPDATE training_emails SET status='sent',provider_id=?,last_error=NULL,lease_until=0 WHERE id=?",
      )
        .bind(result.id, row.id)
        .run();
      sent++;
    } catch (e) {
      await env.DB.prepare(
        "UPDATE training_emails SET status='pending',last_error=?,lease_until=? WHERE id=?",
      )
        .bind(
          e instanceof Error ? e.message : "Email delivery failed.",
          Date.now() +
            Math.min(3600000, 30000 * 2 ** Math.min(row.attempts, 7)),
          row.id,
        )
        .run();
    }
  }
  return { configured: true, sent };
}
