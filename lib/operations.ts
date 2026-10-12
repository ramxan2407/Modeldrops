export async function observedTask<T>(
  db: D1Database,
  name: string,
  task: () => Promise<T>,
) {
  const started = new Date().toISOString();
  const runId = crypto.randomUUID();
  await db
    .prepare(
      "INSERT INTO operational_checks(name,run_id,started_at,status) VALUES(?,?,?,'running') ON CONFLICT(name) DO UPDATE SET run_id=excluded.run_id,started_at=excluded.started_at,finished_at=NULL,status='running'",
    )
    .bind(name, runId, started)
    .run();
  try {
    const result = await task();
    await db
      .prepare(
        "UPDATE operational_checks SET status='ok',finished_at=? WHERE name=? AND run_id=?",
      )
      .bind(new Date().toISOString(), name, runId)
      .run();
    return result;
  } catch (error) {
    await db
      .prepare(
        "UPDATE operational_checks SET status='failed',finished_at=? WHERE name=? AND run_id=?",
      )
      .bind(new Date().toISOString(), name, runId)
      .run();
    throw error;
  }
}

export async function operationsState(db: D1Database, now = Date.now()) {
  const [checks, counts] = await Promise.all([
    db
      .prepare(
        "SELECT name,started_at,finished_at,status FROM operational_checks ORDER BY name",
      )
      .all<{
        name: string;
        started_at: string;
        finished_at: string | null;
        status: string;
      }>(),
    db
      .prepare(
        "SELECT (SELECT COUNT(*) FROM generation_jobs WHERE status='needs_review') review_jobs,(SELECT COUNT(*) FROM generations WHERE status IN ('queued','processing') AND updated_at<?) stalled_jobs,(SELECT COUNT(*) FROM training_emails WHERE status IN ('pending','sending')) pending_emails,(SELECT COUNT(*) FROM training_emails WHERE status='failed') failed_emails,(SELECT COUNT(*) FROM storage_cleanup) cleanup_pending",
      )
      .bind(new Date(now - 30 * 60000).toISOString())
      .first<Record<string, number>>(),
  ]);
  return {
    checks: ["generation", "email", "storage"].map((name) => {
      const row = checks.results.find((r) => r.name === name);
      return {
        name,
        lastRun: row?.finished_at || row?.started_at || null,
        status: !row
          ? "not_seen"
          : now - Date.parse(row.started_at) > 5 * 60000
            ? "stale"
            : row.status,
      };
    }),
    counts: counts || {},
  };
}
