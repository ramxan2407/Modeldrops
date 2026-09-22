import type { GenerationEnvironment } from "./models";
export async function downloadOutput(
  url: string,
  type: string,
  env: GenerationEnvironment,
  fetcher: typeof fetch = fetch,
) {
  const parsed = new URL(url);
  const hosts = new Set([
    "cloudflare-static.wavespeed.ai",
    "static.wavespeed.ai",
    ...(env.WAVESPEED_OUTPUT_HOSTS || "")
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
