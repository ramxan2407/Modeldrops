import { z } from "zod";
import { generationSettings } from "../pricing";
import { credentialsFor } from "./credentials.mjs";
export const higgsfieldModels = [
  {
    id: "higgsfield-soul-2",
    name: "Soul 2",
    provider: "Higgsfield",
    type: "image",
    credits: 12,
    time: "Usually under a minute",
    description: "Generate an image from a prompt",
    ratios: ["1:1", "16:9", "9:16", "4:3", "3:4", "2:3", "3:2"],
    resolutions: ["720", "1080"],
    enabled: true,
    endpoint: "higgsfield-ai/soul/v2/standard",
  },
  {
    id: "higgsfield-kling-3",
    name: "Kling 3.0 Standard",
    provider: "Higgsfield",
    type: "video",
    credits: 120,
    time: "Several minutes",
    description: "Create video with optional sound and multiple shots",
    ratios: ["1:1", "16:9", "9:16"],
    resolutions: ["standard"],
    enabled: true,
    endpoint: "kling-video/v3.0/std/text-to-video",
  },
];
export const higgsfieldModel = (id: string) =>
  higgsfieldModels.find((m) => m.id === id);
export type HiggsfieldEnvironment = {
  HF_CREDENTIALS?: string;
  HF_API_KEY_ID?: string;
  HF_API_KEY_SECRET?: string;
  HIGGSFIELD_ENABLED?: string;
  HIGGSFIELD_DAILY_LIMIT_USD?: string;
  HIGGSFIELD_OUTPUT_HOSTS?: string;
};
export const higgsfieldEnabled = (env: HiggsfieldEnvironment) =>
  env.HIGGSFIELD_ENABLED === "true" && !!credentialsFor(env);

export function generationInput(
  modelId: string,
  prompt: string,
  settings: z.infer<typeof generationSettings>,
  characterId?: string | null,
  reference?: string | null,
) {
  settings = generationSettings.parse(settings);
  const model = higgsfieldModel(modelId);
  if (!model) throw new Error("Unsupported Higgsfield model.");
  if (characterId || reference)
    throw new Error(
      "This model supports prompts only. Clear the character and reference image to continue.",
    );
  if (
    !(model.type === "image" ? [1, 4] : [1]).includes(settings.outputs) ||
    !model.ratios.includes(settings.ratio) ||
    !model.resolutions.includes(settings.resolution)
  )
    throw new Error(
      "Choose a supported output count, aspect ratio and resolution.",
    );
  if (settings.negative)
    throw new Error("Negative prompts are not supported by this model.");
  if (model.type === "image") {
    if (
      settings.seed !== null &&
      (!Number.isInteger(settings.seed) ||
        settings.seed < 1 ||
        settings.seed > 1000000)
    )
      throw new Error("Soul 2 seeds must be between 1 and 1,000,000.");
    return {
      prompt,
      batch_size: settings.outputs,
      resolution: settings.resolution + "p",
      aspect_ratio: settings.ratio,
      seed: settings.seed,
      enhance_prompt: settings.enhancePrompt ?? true,
      ...(settings.styleId ? { style_id: settings.styleId } : {}),
    };
  }
  if (settings.seed !== null)
    throw new Error("Kling does not support a seed on this endpoint.");
  if (settings.shots?.length && !settings.multiShots)
    throw new Error("Enable multiple shots to use a shot list.");
  if (
    settings.shots?.length &&
    settings.shots.reduce((sum, shot) => sum + shot.duration, 0) !==
      settings.duration
  )
    throw new Error("Shot durations must add up to the total video duration.");
  return {
    prompt,
    duration: settings.duration,
    aspect_ratio: settings.ratio,
    sound: settings.sound ? "on" : "off",
    multi_shots: settings.multiShots ?? false,
    cfg_scale: settings.cfgScale ?? 0.5,
    ...(settings.shots?.length ? { multi_prompt: settings.shots } : {}),
    ...(settings.elements?.length ? { elements: settings.elements } : {}),
  };
}

// Conservative reservation at published undiscounted rates, not customer pricing.
export function providerReserve(
  modelId: string,
  settings: { resolution: string; duration: number; outputs?: number },
) {
  return modelId === "higgsfield-soul-2"
    ? (settings.resolution === "1080" ? 5700 : 3200) * (settings.outputs ?? 1)
    : settings.duration * 84000;
}
export function dailyLimit(env: HiggsfieldEnvironment) {
  const value = Number(env.HIGGSFIELD_DAILY_LIMIT_USD || "5");
  if (!Number.isFinite(value) || value <= 0 || value > 10000)
    throw new Error("Invalid Higgsfield daily limit.");
  return Math.floor(value * 1000000);
}
