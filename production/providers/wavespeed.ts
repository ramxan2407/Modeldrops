import {
  type AIProvider,
  type ProviderRequest,
  type ProviderResult,
  calculateProviderCost,
  providerFetch,
  UnsupportedCapability,
  SubmissionUncertain,
} from "./types";
export class WaveSpeedProvider implements AIProvider {
  readonly name = "wavespeed";
  constructor(private key: string) {
    if (!key) throw new Error("WAVESPEED_API_KEY is required");
  }
  private async submit(input: ProviderRequest) {
    if (
      !/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_.-]+)+$/.test(input.model) ||
      input.model.includes("..")
    )
      throw new Error("Invalid registry model slug");
    const raw = await providerFetch(
      `https://api.wavespeed.ai/api/v3/${input.model}`,
      this.key,
      { ...input.parameters, prompt: input.prompt },
    );
    try {
      return this.normalizeResponse(raw);
    } catch {
      throw new SubmissionUncertain(
        "Unrecognized WaveSpeed submission response; reconcile before retry.",
      );
    }
  }
  generateImage(input: ProviderRequest) {
    return this.submit(input);
  }
  generateVideo(input: ProviderRequest) {
    return this.submit(input);
  }
  async generateText(_: ProviderRequest): Promise<ProviderResult> {
    throw new UnsupportedCapability(
      "Configure a text adapter for this provider",
    );
  }
  async getStatus(id: string) {
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error("Invalid task ID");
    return this.normalizeResponse(
      await providerFetch(
        `https://api.wavespeed.ai/api/v3/predictions/${id}/result`,
        this.key,
      ),
    );
  }
  async cancelGeneration(_: string) {
    return { supported: false, cancelled: false };
  } // Deleting a task is not assumed to cancel or refund computation.
  calculateProviderCost = calculateProviderCost;
  normalizeResponse(raw: unknown): ProviderResult {
    const r = raw as {
      code?: number;
      data?: { id?: string; status?: string; outputs?: string[] };
    };
    if (r.code !== 200 || !r.data?.id)
      throw new Error("Invalid WaveSpeed response");
    const d = r.data;
    const status =
      d.status === "completed"
        ? "completed"
        : ["failed", "timeout", "deleted"].includes(d.status || "")
          ? "failed"
          : d.status === "cancelled"
            ? "cancelled"
            : d.status === "processing"
              ? "processing"
              : "queued";
    return {
      id: d.id,
      status,
      outputs: (d.outputs || []).map((url) => ({ url })),
    };
  }
}
