import { bindings } from "@/lib/server";
import { deliverTrainingEmails } from "@/lib/lora/email";
import { loraFailure } from "@/lib/lora/http";
import { LoraError } from "@/lib/lora/types";
export async function POST(request: Request) {
  try {
    const env = bindings();
    if (
      !env.JOB_RUNNER_SECRET ||
      request.headers.get("authorization") !== `Bearer ${env.JOB_RUNNER_SECRET}`
    )
      throw new LoraError(401, "Unauthorized.");
    return Response.json(await deliverTrainingEmails(env));
  } catch (e) {
    return loraFailure(e);
  }
}
