import snapshot from "./image-catalog.json";
import { type ImageDefinition, imageCredits } from "./image-schema";
const source = snapshot.images as unknown as ImageDefinition[];
const endpoints = [
  "wavespeed-ai/qwen-image/edit",
  "openai/gpt-image-2.5-flare/text-to-image",
  "openai/gpt-image-2.5-sunburst/text-to-image",
];
export const imageCatalog: ImageDefinition[] = endpoints.map((endpoint) => {
  const model = source.find((m) => m.endpoint === endpoint);
  if (!model) throw Error(`Missing configured image model: ${endpoint}`);
  if (!endpoint.startsWith("openai/")) return model;
  const edit = source.find(
    (m) => m.endpoint === endpoint.replace("/text-to-image", "/edit"),
  );
  if (!edit?.schema.properties?.images)
    throw Error("Missing GPT image edit schema.");
  return {
    ...model,
    schema: {
      ...model.schema,
      properties: {
        ...model.schema.properties,
        images: edit.schema.properties.images,
      },
      "x-order-properties": [
        "images",
        ...(model.schema["x-order-properties"] || []),
      ],
    },
  };
});
export const catalogSyncedAt = snapshot.syncedAt;
export const imageModelId = (endpoint: string) =>
  endpoint === "wavespeed-ai/qwen-image/edit"
    ? "wavespeed-qwen-image-edit"
    : `wavespeed:${endpoint}`;
export const imageDefinition = (id: string) =>
  imageCatalog.find((m) => imageModelId(m.endpoint) === id);
export function imageEndpoint(id: string, input: Record<string, unknown>) {
  const model = imageDefinition(id);
  if (!model) throw Error("Choose an available image model.");
  return model.endpoint.startsWith("openai/") &&
    Array.isArray(input.images) &&
    input.images.length
    ? model.endpoint.replace("/text-to-image", "/edit")
    : model.endpoint;
}
export const imageModels = imageCatalog.map((m) => ({
  id: imageModelId(m.endpoint),
  endpoint: m.endpoint,
  name:
    m.endpoint === "wavespeed-ai/qwen-image/edit"
      ? "Qwen Image Edit"
      : m.endpoint.includes("sunburst")
        ? "GPT Image 2.5 Sunburst"
        : "GPT Image 2.5 Flare",
  provider: "WaveSpeed",
  type: "image",
  credits: imageCredits(m.basePrice),
  basePrice: m.basePrice,
  publisher: m.endpoint.split("/")[0],
  category: m.endpoint.startsWith("openai/")
    ? "generate-and-edit"
    : "image-to-image",
  time: "Time varies by model",
  description: m.endpoint.startsWith("openai/")
    ? `${m.endpoint.includes("sunburst") ? "Detail-focused" : "Fast, balanced"} images from text or references. Five quality levels, up to 4K.`
    : "Edit a reference image with precise text instructions while preserving its style.",
  ratios: ["custom"],
  resolutions: ["custom"],
  enabled: true,
}));
