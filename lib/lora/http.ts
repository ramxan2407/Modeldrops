import { auth, bindings, initialize, ApiError, fail } from "@/lib/server";
import { LoraService } from "./service";
import { stagedUpload } from "../upload-transfer";
import { LoraError } from "./types";
export async function loraService() {
  const user = await auth();
  await initialize(user);
  return new LoraService(bindings(), user);
}
export function loraFailure(e: unknown) {
  return fail(e instanceof LoraError ? new ApiError(e.status, e.message) : e);
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin !== new URL(request.url).origin)
    throw new LoraError(403, "Cross-origin request rejected.");
}
export async function boundedBytes(request: Request, max: number) {
  const staged = await stagedUpload(request, max);
  if (staged) return staged;
  const reader = request.body?.getReader();
  if (!reader) throw new LoraError(400, "Upload is empty.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > max) {
      await reader.cancel();
      throw new LoraError(413, "Upload exceeds the size limit.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}
