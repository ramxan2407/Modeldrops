import { z } from "zod";
export const generationSettings = z
  .object({
    ratio: z.enum(["1:1", "16:9", "9:16", "4:5"]),
    resolution: z.enum(["720", "1080", "1024", "2048"]),
    outputs: z.union([z.literal(1), z.literal(2), z.literal(4)]),
    negative: z.string().max(1000).default(""),
    seed: z.number().int().min(0).max(4294967295).nullable(),
    duration: z.union([z.literal(5), z.literal(10)]),
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
      (type === "video" ? settings.duration / 5 : 1),
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
