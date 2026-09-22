export const higgsfieldModels = [
  {
    id: "higgsfield-soul-2",
    name: "Soul 2",
    provider: "Higgsfield",
    type: "image",
    credits: 12,
    time: "Usually under a minute",
    description: "Generate an image from a prompt",
    ratios: ["1:1", "16:9", "9:16"],
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
    description: "Generate a silent video from a prompt",
    ratios: ["1:1", "16:9", "9:16"],
    resolutions: ["720"],
    enabled: true,
    endpoint: "kling-video/v3.0/std/text-to-video",
  },
];
export const higgsfieldModel = (id: string) =>
  higgsfieldModels.find((m) => m.id === id);
export type HiggsfieldEnvironment = {
  HF_API_KEY_ID?: string;
  HF_API_KEY_SECRET?: string;
  HIGGSFIELD_ENABLED?: string;
  HIGGSFIELD_DAILY_LIMIT_USD?: string;
  HIGGSFIELD_OUTPUT_HOSTS?: string;
};
export const higgsfieldEnabled = (env: HiggsfieldEnvironment) =>
  env.HIGGSFIELD_ENABLED === "true" &&
  !!env.HF_API_KEY_ID &&
  !!env.HF_API_KEY_SECRET;

export function generationInput(
  modelId: string,
  prompt: string,
  settings: {
    outputs: number;
    ratio: string;
    resolution: string;
    negative: string;
    seed: number | null;
    duration: number;
  },
  characterId?: string | null,
  reference?: string | null,
) {
  const model = higgsfieldModel(modelId);
  if (!model) throw new Error("Unsupported Higgsfield model.");
  if (characterId || reference)
    throw new Error(
      "This model supports prompts only. Clear the character and reference image to continue.",
    );
  if (
    settings.outputs !== 1 ||
    !model.ratios.includes(settings.ratio) ||
    !model.resolutions.includes(settings.resolution)
  )
    throw new Error(
      "Choose one output and a supported aspect ratio and resolution.",
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
      batch_size: 1,
      resolution: settings.resolution + "p",
      aspect_ratio: settings.ratio,
      seed: settings.seed,
      enhance_prompt: true,
    };
  }
  if (settings.seed !== null || ![5, 10].includes(settings.duration))
    throw new Error("Choose a 5 or 10 second video without a seed.");
  return {
    prompt,
    duration: settings.duration,
    aspect_ratio: settings.ratio,
    sound: "off",
    multi_shots: false,
    cfg_scale: 0.5,
  };
}

// Conservative reservation at published undiscounted rates, not customer pricing.
export function providerReserve(
  modelId: string,
  settings: { resolution: string; duration: number },
) {
  return modelId === "higgsfield-soul-2"
    ? settings.resolution === "1080"
      ? 5700
      : 3200
    : settings.duration * 84000;
}
export function dailyLimit(env: HiggsfieldEnvironment) {
  const value = Number(env.HIGGSFIELD_DAILY_LIMIT_USD || "5");
  if (!Number.isFinite(value) || value <= 0 || value > 10000)
    throw new Error("Invalid Higgsfield daily limit.");
  return Math.floor(value * 1000000);
}
