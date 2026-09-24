import { z } from "zod";
import type { GenerationEnvironment } from "./models";
const taskId = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-zA-Z0-9_-]+$/);
const resultSchema = z.object({
  code: z.literal(200),
  data: z.object({
    id: taskId,
    status: z.string().min(1),
    outputs: z.array(z.string().url()).nullish(),
  }),
});
export class RejectedSubmission extends Error {
  constructor(public status: number) {
    super(`WaveSpeed rejected the request (HTTP ${status}).`);
  }
  get userMessage() {
    if (this.status === 402)
      return "The generation service balance is insufficient. Please contact the administrator.";
    if ([401, 403].includes(this.status))
      return "Generation credentials or model access need administrator attention.";
    if (this.status === 429)
      return "Generation is temporarily rate-limited. Please try again later.";
    if ([400, 422].includes(this.status))
      return "The generation service rejected these settings.";
    return "The generation service could not accept this request.";
  }
}
export class WaveSpeedClient {
  constructor(
    private env: GenerationEnvironment,
    private fetcher: typeof fetch = fetch,
  ) {}
  private async request(path: string, input?: unknown) {
    const key = this.env.WAVESPEED_API_KEY?.trim();
    if (!key || /\s/.test(key))
      throw new Error("WaveSpeed API key missing or malformed.");
    const response = await this.fetcher(
      `https://api.wavespeed.ai/api/v3/${path}`,
      {
        method: input === undefined ? "GET" : "POST",
        redirect: "error",
        signal: AbortSignal.timeout(20000),
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        ...(input === undefined ? {} : { body: JSON.stringify(input) }),
      },
    );
    if (!response.ok) {
      // Timeouts, 5xx and unreadable responses retain credits for reconciliation, never a second paid POST.
      if (
        input !== undefined &&
        [400, 401, 402, 403, 404, 422, 423, 429].includes(response.status)
      )
        throw new RejectedSubmission(response.status);
      throw new Error(`WaveSpeed request failed (HTTP ${response.status}).`);
    }
    const { data } = resultSchema.parse(await response.json());
    return {
      id: data.id,
      status:
        data.status === "completed"
          ? "completed"
          : data.status === "cancelled"
            ? "cancelled"
            : ["failed", "timeout", "deleted"].includes(data.status)
              ? "failed"
              : "processing",
      outputs: data.outputs || [],
    };
  }
  submit(endpoint: string, input: unknown) {
    if (
      !/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_.-]+)+$/.test(endpoint) ||
      endpoint.includes("..")
    )
      throw new Error("Invalid model endpoint.");
    return this.request(endpoint, input);
  }
  async status(id: string) {
    taskId.parse(id);
    const result = await this.request(`predictions/${id}/result`);
    if (result.id !== id)
      throw new Error("Provider returned a mismatched request.");
    return result;
  }
}
