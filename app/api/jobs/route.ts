import { deliverTrainingEmails } from "@/lib/lora/email";
import { drainStorageCleanup } from "@/lib/storage-cleanup";
import { env as runtimeEnv, waitUntil } from "cloudflare:workers";
import { bindings, ApiError, fail } from "@/lib/server";
import { runGenerationJob } from "@/lib/generation/worker";
import { observedTask } from "@/lib/operations";
/** Scheduler recovery endpoint; deployment must supply JOB_RUNNER_SECRET and a periodic external invocation. */
export async function POST(request: Request) {
  try {
    const { JOB_RUNNER_SECRET, CRON_SECRET } = runtimeEnv as unknown as {
      JOB_RUNNER_SECRET?: string;
      CRON_SECRET?: string;
    };
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
    const environment = bindings();
    const { DB } = environment;
    waitUntil(
      observedTask(DB, "email", () => deliverTrainingEmails(environment)).catch(
        () => console.error("Scheduled email delivery needs retry."),
      ),
    );
    waitUntil(
      observedTask(DB, "storage", () => drainStorageCleanup(environment)).catch(
        () => console.error("Scheduled storage cleanup needs retry."),
      ),
    );
    const jobs = await DB.prepare(
      "SELECT generation_id FROM generation_jobs WHERE status='queued' OR (status='processing' AND lease_until<?) ORDER BY created_at LIMIT 3",
    )
      .bind(new Date().toISOString())
      .all<{ generation_id: string }>();
    waitUntil(
      observedTask(DB, "generation", async () => {
        await DB.prepare("DELETE FROM auth_rate_limits WHERE window_start<?")
          .bind(Date.now() - 3600000)
          .run();
        await Promise.all(
          jobs.results.map((j) =>
            runGenerationJob(j.generation_id, new URL(request.url).origin),
          ),
        );
      }).catch(() =>
        console.error("Scheduled generation recovery needs retry."),
      ),
    );
    return Response.json(
      { scheduled: jobs.results.length },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return fail(e);
  }
}

export const GET = POST;
