import { waitUntil } from "cloudflare:workers";
import { bindings, ApiError, fail } from "@/lib/server";
import { runGenerationJob } from "@/lib/higgsfield/worker";
/** Scheduler recovery endpoint; deployment must supply JOB_RUNNER_SECRET and a periodic external invocation. */
export async function POST(request: Request) {
  try {
    const { DB, JOB_RUNNER_SECRET, CRON_SECRET } = bindings();
    if (
      !(JOB_RUNNER_SECRET || CRON_SECRET) ||
      ![JOB_RUNNER_SECRET, CRON_SECRET]
        .filter(Boolean)
        .some(
          (secret) =>
            request.headers.get("authorization") === `Bearer ${secret}`,
        )
    )
      throw new ApiError(401, "Unauthorized");
    const jobs = await DB.prepare(
      "SELECT generation_id FROM generation_jobs WHERE status='queued' OR (status='processing' AND lease_until<?) ORDER BY created_at LIMIT 3",
    )
      .bind(new Date().toISOString())
      .all<any>();
    for (const j of jobs.results)
      waitUntil(runGenerationJob(j.generation_id, new URL(request.url).origin));
    return Response.json({ scheduled: jobs.results.length });
  } catch (e) {
    return fail(e);
  }
}

export const GET = POST;
