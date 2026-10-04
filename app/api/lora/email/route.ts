import { env as runtimeEnv } from "cloudflare:workers";
import { bindings } from "@/lib/server";
import { deliverTrainingEmails } from "@/lib/lora/email";
import { loraFailure } from "@/lib/lora/http";
import { LoraError } from "@/lib/lora/types";
export async function POST(request: Request) {
  try {
    const { JOB_RUNNER_SECRET } = runtimeEnv as unknown as {
      JOB_RUNNER_SECRET?: string;
    };
    if (
      !JOB_RUNNER_SECRET ||
      request.headers.get("authorization") !== `Bearer ${JOB_RUNNER_SECRET}`
    )
      throw new LoraError(401, "Unauthorized.");
    const env = bindings();
    return Response.json(await deliverTrainingEmails(env));
  } catch (e) {
    return loraFailure(e);
  }
}
