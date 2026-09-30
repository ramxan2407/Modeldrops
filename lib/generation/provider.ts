import { WaveSpeedClient } from "./client";
import type { GenerationEnvironment } from "./models";
export interface ProviderResult {
  id: string;
  status: string;
  outputs: string[];
}
export interface GenerationProvider {
  submit(endpoint: string, input: unknown): Promise<ProviderResult>;
  status(id: string): Promise<ProviderResult>;
}
/** Provider selection stays on the server. Unregistered providers never receive a paid job. */
export function generationProvider(
  name: string,
  env: GenerationEnvironment,
  fetcher: typeof fetch = fetch,
): GenerationProvider {
  if (name === "WaveSpeed") return new WaveSpeedClient(env, fetcher);
  throw new Error("This generation provider is not connected.");
}
