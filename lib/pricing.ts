import { z } from "zod";
export const generationSettings = z
  .object({
    providerInputs: z.record(z.unknown()).optional(),
    ratio: z.enum([
      "1:1",
      "16:9",
      "9:16",
      "4:5",
      "4:3",
      "3:4",
      "2:3",
      "3:2",
      "custom",
    ]),
    resolution: z.enum(["720", "1080", "1024", "2048", "standard", "custom"]),
    outputs: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
    negative: z.string().max(1000).default(""),
    seed: z.number().int().min(0).max(4294967295).nullable(),
    duration: z.number().int().min(3).max(15),
    width: z.number().int().min(256).max(1536).optional(),
    height: z.number().int().min(256).max(1536).optional(),
    outputFormat: z.enum(["jpeg", "png", "webp"]).optional(),
    shotType: z.enum(["customize", "intelligence"]).optional(),
    // Retained to recognize historic payloads; current models reject unsupported settings.
    enhancePrompt: z.boolean().optional(),
    styleId: z.union([z.literal(""), z.string().uuid()]).optional(),
    sound: z.boolean().optional(),
    cfgScale: z.number().min(0).max(1).multipleOf(0.01).optional(),
    multiShots: z.boolean().optional(),
    shots: z
      .array(
        z
          .object({
            prompt: z.string().trim().min(1).max(512),
            duration: z.number().int().min(1).max(15),
          })
          .strict(),
      )
      .max(6)
      .optional(),
    elements: z.array(z.string().trim().min(1).max(200)).max(20).optional(),
  })
  .strict();
export function calculateCredits(
  base: number,
  type: string,
  settings: z.infer<typeof generationSettings>,
) {
  const resolutionMultiplier = ["2048", "1080"].includes(settings.resolution)
    ? 2
    : 1;
  return Math.ceil(
    base *
      settings.outputs *
      resolutionMultiplier *
      (type === "video"
        ? (settings.duration / 5) * (settings.sound ? 1.5 : 1)
        : 1),
  );
}
export function priceForMargin(
  providerCostCents: number,
  targetGrossMargin: number,
  creditValueCents: number,
  minimum: number,
) {
  if (
    !Number.isFinite(providerCostCents) ||
    providerCostCents < 0 ||
    targetGrossMargin < 0 ||
    targetGrossMargin >= 1 ||
    creditValueCents <= 0 ||
    minimum < 1
  )
    throw new Error("Invalid pricing configuration");
  return Math.max(
    minimum,
    Math.ceil(providerCostCents / (1 - targetGrossMargin) / creditValueCents),
  );
}
