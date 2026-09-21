export const statuses = [
  "pending",
  "approved",
  "training",
  "quality_check",
  "completed",
  "rejected",
] as const;
export type TrainingStatus = (typeof statuses)[number];
export const statusLabels: Record<TrainingStatus | "draft", string> = {
  draft: "Draft",
  pending: "Pending Review",
  approved: "Approved",
  training: "Training In Progress",
  quality_check: "Quality Check",
  completed: "Completed",
  rejected: "Rejected",
};
export const characterTypes = [
  "Human",
  "Anime",
  "Stylized",
  "Product",
  "Pet",
  "Other",
] as const;
export const MIN_IMAGES = 15;
export const MAX_IMAGES = 100;
export const PART_SIZE = 8 * 1024 * 1024;
export const MAX_LORA_SIZE = 2 * 1024 * 1024 * 1024;
export type TrainingRequest = {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  character_name: string;
  character_description: string;
  character_type: string;
  trigger_word: string;
  notes: string;
  instructions: string;
  reference_prompt: string;
  image_count: number;
  dataset_size: number;
  status: TrainingStatus | "draft";
  revision: number;
  rejection_reason: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
};
export type TrainingFile = {
  id: string;
  request_id: string;
  kind: "dataset" | "weights" | "cover";
  name: string;
  mime: string;
  size: number;
  ready: number;
  storage_key: string;
  upload_id: string | null;
};
export type TrainedLora = {
  id: string;
  request_id: string;
  name: string;
  trigger_word: string;
  recommended_prompt: string;
  version: string;
  description: string;
  file_id: string;
  cover_id: string;
  created_at: string;
  deleted_at: string | null;
};
export type TrainingEvent = {
  id: string;
  status: TrainingStatus;
  message: string;
  created_at: string;
};
export type LoraState = {
  requests: TrainingRequest[];
  loras: TrainedLora[];
  maxImageMb: number;
  maxLoraMb?: number;
  email?: { configured: boolean; pending: number; failed: number };
};
export class LoraError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function transitionAllowed(from: string, to: string) {
  return (
    (
      {
        pending: ["approved", "rejected"],
        approved: ["training", "rejected"],
        training: ["quality_check", "rejected"],
        quality_check: ["training", "completed", "rejected"],
      } as Record<string, string[]>
    )[from]?.includes(to) ?? false
  );
}
// Future adapters must preserve the same request lifecycle. None run automatically today.
export interface TrainingProvider {
  id: "manual" | "runpod" | "modal" | "comfyui" | "ostris";
  capabilities: ("flux" | "sdxl" | "wan")[];
  start(requestId: string): Promise<{ externalJobId: string }>;
  status(externalJobId: string): Promise<TrainingStatus>;
}
export const futureTrainingIntegrations = [
  "RunPod",
  "Modal",
  "ComfyUI",
  "Ostris AI Toolkit",
  "Flux",
  "SDXL",
  "WAN",
] as const;
export function imageMime(bytes: Uint8Array) {
  const s = (a: number, b: number) =>
    new TextDecoder().decode(bytes.slice(a, b));
  if (
    bytes.length >= 24 &&
    bytes[0] === 137 &&
    s(1, 4) === "PNG" &&
    bytes[4] === 13 &&
    bytes[5] === 10 &&
    bytes[6] === 26 &&
    bytes[7] === 10
  )
    return "image/png";
  if (
    bytes.length >= 4 &&
    bytes[0] === 255 &&
    bytes[1] === 216 &&
    bytes[2] === 255
  )
    return "image/jpeg";
  if (bytes.length >= 16 && s(0, 4) === "RIFF" && s(8, 12) === "WEBP")
    return "image/webp";
  throw new LoraError(400, "Use a valid JPG, PNG, or WEBP image.");
}
export function validateSafetensors(bytes: Uint8Array, total: number) {
  if (bytes.length < 10) throw new LoraError(400, "Invalid safetensors file.");
  const headerLength = Number(
    new DataView(bytes.buffer, bytes.byteOffset, 8).getBigUint64(0, true),
  );
  if (
    !Number.isSafeInteger(headerLength) ||
    headerLength < 2 ||
    headerLength > PART_SIZE - 8 ||
    headerLength + 8 >= total ||
    headerLength + 8 > bytes.length
  )
    throw new LoraError(400, "Invalid or oversized safetensors header.");
  let header: Record<string, unknown>;
  try {
    header = JSON.parse(
      new TextDecoder().decode(bytes.slice(8, 8 + headerLength)),
    );
  } catch {
    throw new LoraError(400, "Invalid safetensors header.");
  }
  if (!header || typeof header !== "object" || Array.isArray(header))
    throw new LoraError(400, "Invalid safetensors header.");
  const tensors = Object.entries(header).filter(
    ([key]) => key !== "__metadata__",
  );
  if (!tensors.length)
    throw new LoraError(400, "The LoRA file contains no tensors.");
  for (const [, value] of tensors) {
    const t = value as {
      dtype?: string;
      shape?: unknown;
      data_offsets?: number[];
    };
    if (
      !t ||
      typeof t.dtype !== "string" ||
      !Array.isArray(t.shape) ||
      !Array.isArray(t.data_offsets) ||
      t.data_offsets.length !== 2 ||
      !t.data_offsets.every(Number.isSafeInteger) ||
      t.data_offsets[0] < 0 ||
      t.data_offsets[1] < t.data_offsets[0] ||
      t.data_offsets[1] > total - headerLength - 8
    )
      throw new LoraError(400, "Invalid tensor data offsets.");
  }
}
