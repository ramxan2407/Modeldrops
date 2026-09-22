// Shared schema interpreter: controls and server validation use the same contract.
export type InputSchema = {
  type?: string;
  title?: string;
  description?: string;
  default?: unknown;
  enum?: unknown[];
  properties?: Record<string, InputSchema>;
  required?: string[];
  items?: InputSchema;
  minimum?: number;
  maximum?: number;
  minItems?: number;
  maxItems?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  additionalProperties?: boolean;
  disabled?: boolean;
  "x-order-properties"?: string[];
  "x-ui-component"?: string;
};
export type ImageDefinition = {
  endpoint: string;
  category: string;
  basePrice: number;
  description: string;
  schema: InputSchema;
};
export const creditsPerProviderDollar = 600; // Preserve the established Qwen rate: $0.02 → 12 credits.
export const imageCredits = (usd: number) =>
  Math.max(1, Math.ceil(Number((usd * creditsPerProviderDollar).toFixed(8))));
export const fieldLabel = (name: string) =>
  name.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
export const managedFields = new Set([
  "enable_sync_mode",
  "enable_base64_output",
]);
export function schemaDefaults(s: InputSchema): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(s.properties || {})
      .filter(([k, v]) => !managedFields.has(k) && v.default !== undefined)
      .map(([k, v]) => [k, structuredClone(v.default)]),
  );
}
export function mediaField(name: string, schema: InputSchema) {
  return (
    /^(image|images|image_urls|reference_images|clothes_images|mask_image|mask|control_image|body_image|face_image|source_image|target_image|person_image|garment_image|reference|reference_image|base_image|image_url|sref)$/.test(
      name,
    ) || /image.*upload|upload.*image/.test(schema["x-ui-component"] || "")
  );
}
function publicUrl(value: string, label: string) {
  if (/^asset:[0-9a-f-]{36}$/.test(value)) return;
  let u: URL;
  try {
    u = new URL(value);
  } catch {
    throw Error(`${label}: use an uploaded image or a public HTTPS URL.`);
  }
  if (
    u.protocol !== "https:" ||
    u.username ||
    u.password ||
    u.port ||
    !u.hostname.includes(".") ||
    /^([\d.]+|\[.*\])$/.test(u.hostname) ||
    /(^|\.)(localhost|local|internal|test|invalid)$/.test(u.hostname)
  )
    throw Error(`${label}: use a public HTTPS URL.`);
}
export function validateValue(
  s: InputSchema,
  v: unknown,
  label: string,
  depth = 0,
): unknown {
  if (depth > 8) throw Error("Input nesting is too deep.");
  if (s.enum && !s.enum.some((e) => JSON.stringify(e) === JSON.stringify(v)))
    throw Error(`${label}: choose a supported value.`);
  if (s.type === "object" || s.properties) {
    if (!v || typeof v !== "object" || Array.isArray(v))
      throw Error(`${label}: expected an object.`);
    const record = v as Record<string, unknown>,
      out: Record<string, unknown> = {};
    for (const k of Object.keys(record))
      if (!Object.hasOwn(s.properties || {}, k))
        throw Error(`${label}: unsupported field ${k}.`);
    for (const [k, p] of Object.entries(s.properties || {})) {
      const x = record[k] ?? p.default;
      if (
        x === undefined ||
        x === "" ||
        (Array.isArray(x) && !x.length && s.required?.includes(k))
      ) {
        if (s.required?.includes(k))
          throw Error(`${fieldLabel(k)} is required.`);
        continue;
      }
      out[k] = validateValue(p, x, fieldLabel(k), depth + 1);
      if (mediaField(k, p)) {
        for (const item of (Array.isArray(out[k])
          ? out[k]
          : [out[k]]) as unknown[])
          if (typeof item === "string") publicUrl(item, fieldLabel(k));
      }
      if (k === "path" && typeof out[k] === "string")
        publicUrl(out[k] as string, label);
    }
    return out;
  }
  if (s.type === "array") {
    if (
      !Array.isArray(v) ||
      v.length < (s.minItems ?? 0) ||
      v.length > Math.min(s.maxItems ?? 50, 50)
    )
      throw Error(
        `${label}: use ${s.minItems ?? 0}–${Math.min(s.maxItems ?? 50, 50)} items.`,
      );
    return v.map((x) => validateValue(s.items || {}, x, label, depth + 1));
  }
  if (s.type === "number" || s.type === "integer") {
    if (
      typeof v !== "number" ||
      !Number.isFinite(v) ||
      (s.type === "integer" && !Number.isSafeInteger(v)) ||
      v < (s.minimum ?? -Number.MAX_SAFE_INTEGER) ||
      v > (s.maximum ?? Number.MAX_SAFE_INTEGER)
    )
      throw Error(
        `${label}: enter a valid ${s.type}${s.minimum !== undefined ? ` from ${s.minimum}` : ""}${s.maximum !== undefined ? ` to ${s.maximum}` : ""}.`,
      );
  } else if (s.type === "boolean") {
    if (typeof v !== "boolean")
      throw Error(`${label}: expected a checkbox value.`);
  } else if (s.type === "string") {
    if (
      typeof v !== "string" ||
      v.length < (s.minLength ?? 0) ||
      v.length > Math.min(s.maxLength ?? 16000, 16000) ||
      (s.pattern && !new RegExp(s.pattern).test(v))
    )
      throw Error(`${label}: enter a valid value.`);
    if (s.format === "uri" || s.format === "url") publicUrl(v, label);
  }
  return v;
}
export function imageInput(
  def: ImageDefinition,
  prompt: string,
  values: Record<string, unknown>,
) {
  if (JSON.stringify(values).length > 64000)
    throw Error("Image settings are too large.");
  for (const k of managedFields)
    if (values[k] === true)
      throw Error("Synchronous and base64 output are managed by the platform.");
  const input: Record<string, unknown> = {
    ...values,
    ...(def.schema.properties?.prompt ? { prompt } : {}),
  };
  for (const k of managedFields)
    if (def.schema.properties?.[k]) input[k] = false;
  const result = validateValue(def.schema, input, "Image settings") as Record<
    string,
    unknown
  >;
  if (
    def.endpoint === "wavespeed-ai/qwen-image/edit" &&
    typeof result.size === "string"
  ) {
    const dimensions = result.size.split("*").map(Number);
    if (
      dimensions.length !== 2 ||
      dimensions.some((n) => !Number.isInteger(n) || n < 1)
    )
      throw Error("Qwen Image dimensions must be positive whole numbers.");
  }
  if (
    def.endpoint.startsWith("openai/") &&
    Array.isArray(result.images) &&
    !result.images.length
  )
    delete result.images;
  return result;
}
