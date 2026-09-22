import { z } from "zod";
import type { HiggsfieldEnvironment } from "./models";
import { credentialsFor } from "./credentials.mjs";
const resultSchema = z.object({
  request_id: z.string().uuid(),
  status: z.enum([
    "queued",
    "in_progress",
    "completed",
    "failed",
    "nsfw",
    "canceled",
  ]),
  images: z.array(z.object({ url: z.string().url() })).optional(),
  video: z.object({ url: z.string().url() }).nullish(),
});
export type HiggsfieldResult = z.infer<typeof resultSchema>;
export class RejectedSubmission extends Error {}
export class HiggsfieldClient {
  constructor(
    private env: HiggsfieldEnvironment,
    private fetcher: typeof fetch = fetch,
  ) {}
  private async request(path: string, input?: unknown) {
    const credentials = credentialsFor(this.env);
    if (!credentials)
      throw new Error("Higgsfield credentials missing or incomplete.");
    const r = await this.fetcher(`https://api.higgsfield.ai/${path}`, {
      method: input ? "POST" : "GET",
      redirect: "error",
      signal: AbortSignal.timeout(20000),
      headers: {
        Authorization: `Key ${credentials}`,
        "Content-Type": "application/json",
      },
      ...(input ? { body: JSON.stringify(input) } : {}),
    });
    if (!r.ok) {
      // Never retry a paid POST whose acceptance is uncertain (network errors/5xx).
      if (input && [400, 401, 403, 404, 422, 423, 429].includes(r.status))
        throw new RejectedSubmission(
          `Higgsfield rejected the request (HTTP ${r.status}).`,
        );
      throw new Error(`Higgsfield request failed (HTTP ${r.status}).`);
    }
    return resultSchema.parse(await r.json());
  }
  submit(endpoint: string, input: unknown) {
    return this.request(endpoint, input);
  }
  async status(id: string) {
    z.string().uuid().parse(id);
    const result = await this.request(`requests/${id}/status`);
    if (result.request_id !== id)
      throw new Error("Provider returned a mismatched request.");
    return result;
  }
}

export async function downloadOutput(
  url: string,
  type: string,
  env: HiggsfieldEnvironment,
  fetcher: typeof fetch = fetch,
) {
  const parsed = new URL(url);
  const hosts = new Set([
    "images.higgs.ai",
    "videos.higgs.ai",
    "cdn.higgsfield.ai",
    "d28lhcrx5qdowv.cloudfront.net",
    ...(env.HIGGSFIELD_OUTPUT_HOSTS || "")
      .split(",")
      .map((h) => h.trim())
      .filter(Boolean),
  ]);
  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    parsed.port ||
    !hosts.has(parsed.hostname)
  )
    throw new Error("Output host requires administrator review.");
  const response = await fetcher(parsed, {
    redirect: "error",
    signal: AbortSignal.timeout(25000),
  });
  if (!response.ok || !response.body)
    throw new Error("Output is not available yet.");
  const mime = response.headers.get("content-type")?.split(";")[0].trim();
  const extensions: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "video/mp4": "mp4",
    "video/webm": "webm",
  };
  if (!mime || !extensions[mime] || !mime.startsWith(type + "/"))
    throw new Error("Unexpected output format.");
  const limit = 45 * 1024 * 1024;
  if (Number(response.headers.get("content-length")) > limit)
    throw new Error("Output exceeds storage delivery limit.");
  const reader = response.body.getReader();
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit)
        throw new Error("Output exceeds storage delivery limit.");
      parts.push(value);
    }
  } finally {
    await reader.cancel();
  }
  if (!size) throw new Error("Provider returned an empty file.");
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }
  const text = (a: number, b: number) =>
    new TextDecoder().decode(bytes.slice(a, b));
  const valid =
    mime === "image/png"
      ? bytes[0] === 137 && text(1, 4) === "PNG"
      : mime === "image/jpeg"
        ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
        : mime === "image/webp"
          ? text(0, 4) === "RIFF" && text(8, 12) === "WEBP"
          : mime === "video/mp4"
            ? text(4, 8) === "ftyp"
            : bytes[0] === 26 &&
              bytes[1] === 69 &&
              bytes[2] === 223 &&
              bytes[3] === 163;
  if (!valid) throw new Error("Output contents do not match their media type.");
  return { bytes, mime, extension: extensions[mime] };
}
