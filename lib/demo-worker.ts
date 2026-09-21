import { bindings, uid, ledgerStatement } from "@/lib/server";
/** Demo-only durable outbox runner. Real provider work belongs in a separate durable queue consumer. */
export async function runDemoJob(id: string, origin: string) {
  const { DB, BUCKET } = bindings();
  const lease = new Date(Date.now() + 60000).toISOString();
  const claim = await DB.prepare(
    "UPDATE generation_jobs SET status='processing',lease_until=?,attempts=attempts+1 WHERE generation_id=? AND (status='queued' OR (status='processing' AND lease_until<?)) RETURNING id",
  )
    .bind(lease, id, new Date().toISOString())
    .first();
  if (!claim) return;
  const g = await DB.prepare("SELECT * FROM generations WHERE id=?")
    .bind(id)
    .first<any>();
  if (!g || !["queued", "processing"].includes(g.status)) return;
  await DB.prepare(
    "UPDATE generations SET status='processing',updated_at=? WHERE id=? AND status='queued'",
  )
    .bind(new Date().toISOString(), id)
    .run();
  try {
    await new Promise((r) => setTimeout(r, 3500));
    const current = await DB.prepare(
      "SELECT status FROM generations WHERE id=?",
    )
      .bind(id)
      .first<{ status: string }>();
    if (current?.status !== "processing") return;
    const image = await fetch(new URL("/assets/hero.png", origin));
    if (!image.ok) throw new Error("Sample asset unavailable");
    const bytes = await image.arrayBuffer();
    if (bytes.byteLength > 12 * 1024 * 1024)
      throw new Error("Sample asset too large");
    const key = `private/${g.user_id}/generations/${id}.png`;
    await BUCKET.put(key, bytes, {
      httpMetadata: { contentType: "image/png" },
    });
    const completed = await DB.batch([
      DB.prepare(
        "UPDATE generations SET status='completed',asset_key=?,updated_at=? WHERE id=? AND status='processing'",
      ).bind(key, new Date().toISOString(), id),
      DB.prepare(
        "UPDATE generation_jobs SET status='completed',lease_until=NULL WHERE generation_id=? AND EXISTS(SELECT 1 FROM generations WHERE id=? AND status='completed')",
      ).bind(id, id),
      DB.prepare(
        "INSERT INTO notifications(id,user_id,message) SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM generations WHERE id=? AND status='completed')",
      ).bind(
        uid(),
        g.user_id,
        "Your demo creation is ready in My Generations.",
        id,
      ),
    ]);
    if (!completed[0].meta.changes) await BUCKET.delete(key);
  } catch (e) {
    console.error(
      "Demo job failed",
      id,
      e instanceof Error ? e.message : "unknown",
    );
    await refundJob(id, "failed", "Demo generation failed · credits returned");
  }
}
export async function refundJob(
  id: string,
  status: "failed" | "cancelled",
  message: string,
) {
  const { DB } = bindings();
  const g = await DB.prepare("SELECT * FROM generations WHERE id=?")
    .bind(id)
    .first<any>();
  if (!g) return;
  await DB.batch([
    DB.prepare(
      "UPDATE generations SET status=?,updated_at=? WHERE id=? AND status IN ('queued','processing')",
    ).bind(status, new Date().toISOString(), id),
    DB.prepare(
      `INSERT OR IGNORE INTO credit_transactions(id,user_id,amount,type,generation_id,description,balance_before,balance_after,idempotency_key) SELECT ?,?,?, 'generation_refund',?,?,COALESCE(SUM(amount),0),COALESCE(SUM(amount),0)+?,? FROM credit_transactions WHERE user_id=? HAVING EXISTS(SELECT 1 FROM generations WHERE id=? AND status IN ('failed','cancelled'))`,
    ).bind(
      uid(),
      g.user_id,
      g.cost,
      id,
      message,
      g.cost,
      `refund:${id}`,
      g.user_id,
      id,
    ),
    DB.prepare(
      "UPDATE generation_jobs SET status=?,lease_until=NULL WHERE generation_id=? AND EXISTS(SELECT 1 FROM generations WHERE id=? AND status IN ('failed','cancelled'))",
    ).bind(status, id, id),
  ]);
}
