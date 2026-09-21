import { waitUntil } from "cloudflare:workers";
import { bindings, ApiError, fail } from "@/lib/server";
import { runDemoJob } from "@/lib/demo-worker";
/** Scheduler recovery endpoint; deployment must supply JOB_RUNNER_SECRET and a periodic external invocation. */
export async function POST(request: Request) {
  try {
    const { DB, JOB_RUNNER_SECRET } = bindings();
    if (
      !JOB_RUNNER_SECRET ||
      request.headers.get("authorization") !== `Bearer ${JOB_RUNNER_SECRET}`
    )
      throw new ApiError(401, "Unauthorized");
    const jobs = await DB.prepare(
      "SELECT generation_id FROM generation_jobs WHERE status='queued' OR (status='processing' AND lease_until<?) ORDER BY created_at LIMIT 10",
    )
      .bind(new Date().toISOString())
      .all<any>();
    for (const j of jobs.results)
      waitUntil(runDemoJob(j.generation_id, new URL(request.url).origin));
    return Response.json({ scheduled: jobs.results.length });
  } catch (e) {
    return fail(e);
  }
}
