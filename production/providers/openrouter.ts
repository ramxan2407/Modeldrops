import {
  type AIProvider,
  type ProviderRequest,
  type ProviderResult,
  calculateProviderCost,
  providerFetch,
  UnsupportedCapability,
  SubmissionUncertain,
} from "./types";
export class OpenRouterProvider implements AIProvider {
  readonly name = "openrouter";
  constructor(private key: string) {
    if (!key) throw new Error("OPENROUTER_API_KEY is required");
  }
  async generateImage(input: ProviderRequest) {
    const raw = await providerFetch(
      "https://openrouter.ai/api/v1/images",
      this.key,
      {
        ...input.parameters,
        model: input.model,
        prompt: input.prompt,
        stream: false,
      },
    );
    try {
      return this.normalizeResponse(raw);
    } catch {
      throw new SubmissionUncertain(
        "Image response invalid; reconcile billing before resubmission.",
      );
    }
  }
  async generateVideo(_: ProviderRequest): Promise<ProviderResult> {
    throw new UnsupportedCapability(
      "Video requires a separately verified provider model adapter",
    );
  }
  async generateText(input: ProviderRequest): Promise<ProviderResult> {
    const raw = (await providerFetch(
      "https://openrouter.ai/api/v1/chat/completions",
      this.key,
      {
        ...input.parameters,
        model: input.model,
        messages: [{ role: "user", content: input.prompt }],
        stream: false,
      },
    )) as any;
    const content = raw.choices?.[0]?.message?.content;
    if (typeof content !== "string")
      throw new SubmissionUncertain(
        "Missing text response; reconcile billing before resubmission.",
      );
    return {
      id: raw.id,
      status: "completed",
      outputs: [],
      text: content,
      costUsd: raw.usage?.cost,
    };
  }
  async getStatus(_: string): Promise<ProviderResult> {
    throw new UnsupportedCapability(
      "This adapter uses blocking provider responses inside an asynchronous worker",
    );
  }
  async cancelGeneration(_: string) {
    return { supported: false, cancelled: false };
  }
  calculateProviderCost = calculateProviderCost;
  normalizeResponse(raw: unknown): ProviderResult {
    const r = raw as {
      data?: { b64_json: string; media_type?: string }[];
      usage?: { cost?: number };
    };
    if (
      !Array.isArray(r.data) ||
      !r.data.length ||
      r.data.some(
        (x) =>
          typeof x.b64_json !== "string" ||
          !["image/png", "image/jpeg", "image/webp"].includes(
            x.media_type || "",
          ),
      )
    )
      throw new Error("Unsupported image response");
    return {
      status: "completed",
      outputs: r.data.map((x) => ({ base64: x.b64_json, mime: x.media_type })),
      costUsd: r.usage?.cost,
    };
  }
}
