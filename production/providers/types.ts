/** Server-only provider contract. Never import from client components. */
export type GenerationKind = "image" | "video" | "text";
export type ProviderRequest = {
  model: string;
  prompt: string;
  parameters: Record<string, unknown>;
};
export type ProviderResult = {
  id?: string;
  status: "queued" | "processing" | "completed" | "failed" | "cancelled";
  outputs: { url?: string; base64?: string; mime?: string }[];
  text?: string;
  costUsd?: number;
};
export interface AIProvider {
  readonly name: string;
  generateImage(input: ProviderRequest): Promise<ProviderResult>;
  generateVideo(input: ProviderRequest): Promise<ProviderResult>;
  generateText(input: ProviderRequest): Promise<ProviderResult>;
  getStatus(id: string): Promise<ProviderResult>;
  cancelGeneration(
    id: string,
  ): Promise<{ supported: boolean; cancelled: boolean }>;
  calculateProviderCost(input: ProviderRequest, price: ProviderPricing): number;
  normalizeResponse(response: unknown): ProviderResult;
}
export type ProviderPricing = { unitCostUsd: number; units: number };
export class UnsupportedCapability extends Error {}
export class SubmissionUncertain extends Error {
  readonly needsReconciliation = true;
}
export function calculateProviderCost(_: ProviderRequest, p: ProviderPricing) {
  if (
    !Number.isFinite(p.unitCostUsd) ||
    p.unitCostUsd < 0 ||
    !Number.isFinite(p.units) ||
    p.units <= 0
  )
    throw new Error("Invalid provider pricing");
  return p.unitCostUsd * p.units;
}
export async function providerFetch(
  url: string,
  key: string,
  body?: unknown,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(body === undefined ? 30000 : 120000),
      redirect: "error",
    });
  } catch {
    if (body !== undefined)
      throw new SubmissionUncertain(
        "Submission outcome unknown; do not automatically resubmit.",
      );
    throw new Error("Provider status temporarily unavailable");
  }
  if (!response.ok) {
    if (body !== undefined && response.status >= 500)
      throw new SubmissionUncertain(
        "Provider may have accepted submission; reconcile before retry.",
      );
    throw new Error(`Provider request rejected (${response.status})`);
  }
  try {
    return await response.json();
  } catch {
    if (body !== undefined)
      throw new SubmissionUncertain(
        "Provider response unreadable; reconcile before retry.",
      );
    throw new Error("Invalid provider response");
  }
}
