type CleanupEnvironment = { DB: D1Database; BUCKET: R2Bucket };
export function queueCleanup(
  db: D1Database,
  key: string,
  uploadId: string | null = null,
) {
  return db
    .prepare(
      "INSERT OR IGNORE INTO storage_cleanup(storage_key,upload_id,created_at) VALUES(?,?,?)",
    )
    .bind(key, uploadId, new Date().toISOString());
}
/** Database removal and queue insertion share a transaction; storage work is retried. */
export async function drainStorageCleanup(env: CleanupEnvironment, limit = 5) {
  // Wait past signed-URL expiry and the maximum upload-processing window.
  // Queue insertion and reservation removal must commit together so failures retry.
  const expiredBefore = Date.now() - 300000;
  await env.DB.batch([
    env.DB.prepare(
      "INSERT OR IGNORE INTO storage_cleanup(storage_key,created_at) SELECT storage_key,? FROM upload_transfers WHERE expires_at<? ORDER BY expires_at,id LIMIT 100",
    ).bind(new Date().toISOString(), expiredBefore),
    env.DB.prepare(
      "DELETE FROM upload_transfers WHERE expires_at<? AND storage_key IN (SELECT storage_key FROM storage_cleanup)",
    ).bind(expiredBefore),
  ]);
  const now = new Date().toISOString();
  const rows = await env.DB.prepare(
    "SELECT storage_key,upload_id,attempts FROM storage_cleanup WHERE lease_until<? ORDER BY created_at LIMIT ?",
  )
    .bind(now, limit)
    .all<{ storage_key: string; upload_id: string | null; attempts: number }>();
  const started = Date.now();
  for (const row of rows.results) {
    if (Date.now() - started > 35000) break;
    const lease = new Date(Date.now() + 120000).toISOString();
    const claim = await env.DB.prepare(
      "UPDATE storage_cleanup SET lease_until=?,attempts=attempts+1 WHERE storage_key=? AND lease_until<?",
    )
      .bind(lease, row.storage_key, now)
      .run();
    if (!claim.meta.changes) continue;
    try {
      if (row.upload_id) {
        try {
          await env.BUCKET.resumeMultipartUpload(
            row.storage_key,
            row.upload_id,
          ).abort();
        } catch (error) {
          if (
            !(error instanceof Error) ||
            !/NoSuchUpload|does not exist|not found/i.test(error.message)
          )
            throw error;
        }
      }
      await env.BUCKET.delete(row.storage_key);
      await env.DB.prepare(
        "DELETE FROM storage_cleanup WHERE storage_key=? AND lease_until=?",
      )
        .bind(row.storage_key, lease)
        .run();
    } catch {
      await env.DB.prepare(
        "UPDATE storage_cleanup SET last_error=?,lease_until=? WHERE storage_key=? AND lease_until=?",
      )
        .bind(
          "Storage cleanup failed; scheduled retry pending.",
          new Date(
            Date.now() +
              Math.min(3600000, 30000 * 2 ** Math.min(row.attempts, 7)),
          ).toISOString(),
          row.storage_key,
          lease,
        )
        .run();
    }
  }
}
