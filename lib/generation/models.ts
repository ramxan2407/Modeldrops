import { imageModels, imageDefinition } from "./images";
import { imageInput } from "./image-schema";
import { z } from "zod";
import { generationSettings } from "../pricing";
export const generationModels = [
  ...imageModels,
  {
    id: "wavespeed-kling-3",
    name: "Kling 3.0 Standard",
    provider: "WaveSpeed",
    type: "video",
    credits: 120,
    time: "Several minutes",
    description: "Create video with optional sound and a custom shot sequence",
    ratios: ["1:1", "16:9", "9:16"],
    resolutions: ["standard"],
    enabled: true,
    endpoint: "kwaivgi/kling-v3.0-std/text-to-video",
  },
];
export const generationModel = (id: string) =>
  generationModels.find((model) => model.id === id);
export type GenerationEnvironment = {
  WAVESPEED_API_KEY?: string;
  WAVESPEED_ENABLED?: string;
  WAVESPEED_DAILY_LIMIT_USD?: string;
  WAVESPEED_OUTPUT_HOSTS?: string;
};
export const generationConfigured = (env: GenerationEnvironment) =>
  env.WAVESPEED_ENABLED === "true";
export const generationEnabled = (env: GenerationEnvironment) =>
  generationConfigured(env) &&
  !!env.WAVESPEED_API_KEY?.trim() &&
  !/\s/.test(env.WAVESPEED_API_KEY.trim());
export function generationInput(
  modelId: string,
  prompt: string,
  settings: z.infer<typeof generationSettings>,
  characterId?: string | null,
  reference?: string | null,
) {
  settings = generationSettings.parse(settings);
  const model = generationModel(modelId);
  if (!model) throw new Error("Choose an available WaveSpeed model.");
  const imageDef = imageDefinition(modelId);
  if (imageDef && settings.providerInputs) {
    if (
      settings.outputs !== 1 ||
      settings.negative ||
      settings.styleId ||
      settings.enhancePrompt ||
      settings.elements?.length ||
      settings.multiShots
    )
      throw new Error("Use the controls supported by this image model.");
    if (characterId || reference)
      throw new Error("Use the model's reference image fields.");
    return imageInput(imageDef, prompt, settings.providerInputs);
  }
  if (imageDef) throw new Error("Choose this model's image settings.");
  if (characterId || reference)
    throw new Error(
      "This workspace model accepts text prompts. Clear character and reference selections first.",
    );
  if (
    !model.ratios.includes(settings.ratio) ||
    !model.resolutions.includes(settings.resolution)
  )
    throw new Error("Choose a supported aspect ratio and resolution.");
  if (
    settings.styleId ||
    settings.enhancePrompt ||
    settings.elements?.length ||
    settings.multiShots
  )
    throw new Error(
      "These saved controls belong to the retired provider. Choose the current model settings.",
    );
  if (settings.outputs !== 1 || settings.seed !== null)
    throw new Error("Kling supports one video per request and no seed.");
  if (settings.width || settings.height || settings.outputFormat)
    throw new Error("Image dimensions and formats are not supported by Kling.");
  if (settings.shots?.length && settings.shotType === "intelligence")
    throw new Error("Use custom shots to submit a shot list.");
  if (
    settings.shots?.length &&
    settings.shots.reduce((sum, shot) => sum + shot.duration, 0) !==
      settings.duration
  )
    throw new Error("Shot durations must add up to the total video duration.");
  return {
    prompt,
    negative_prompt: settings.negative,
    duration: settings.duration,
    aspect_ratio: settings.ratio,
    sound: settings.sound ?? false,
    cfg_scale: settings.cfgScale ?? 0.5,
    shot_type: settings.shotType ?? "customize",
    ...(settings.shots?.length ? { multi_prompt: settings.shots } : {}),
  };
}
// Reserve published rates; estimates do not replace the provider's actual billing.
export function providerReserve(
  modelId: string,
  settings: { duration: number; outputs?: number; sound?: boolean },
) {
  if (modelId !== "wavespeed-kling-3") return 0; // Image reservations come from the live quote.
  return settings.duration * (settings.sound ? 126000 : 84000);
}
export function dailyLimit(env: GenerationEnvironment) {
  const limit = Number(env.WAVESPEED_DAILY_LIMIT_USD || "5");
  if (!Number.isFinite(limit) || limit <= 0 || limit > 10000)
    throw new Error("Invalid generation daily limit.");
  return Math.floor(limit * 1000000);
}
