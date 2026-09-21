import { WaveSpeedProvider } from "./wavespeed";
import { OpenRouterProvider } from "./openrouter";
import type { AIProvider } from "./types";
export function providerFor(
  adapter: string,
  secrets: Record<string, string | undefined>,
): AIProvider {
  switch (adapter) {
    case "wavespeed":
      return new WaveSpeedProvider(secrets.WAVESPEED_API_KEY || "");
    case "openrouter":
      return new OpenRouterProvider(secrets.OPENROUTER_API_KEY || "");
    default:
      throw new Error("Provider adapter not registered");
  }
}
