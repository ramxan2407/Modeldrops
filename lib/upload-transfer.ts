import { auth, bindings, ApiError } from "./server";
export type SignedBucket = R2Bucket & {
  signedUpload?: (key: string, size: number) => Promise<string>;
};
export function transferTarget(url: string) {
  const u = new URL(url, "https://local.invalid");
  return u.pathname + u.search;
}
export async function stagedUpload(
  request: Request,
  max: number,
): Promise<Uint8Array | null> {
  const id = request.headers.get("x-upload-transfer");
  if (!id) return null;
  const user = await auth();
  const { DB, BUCKET } = bindings();
  const r = await DB.prepare(
    "UPDATE upload_transfers SET claimed=1 WHERE id=? AND user_id=? AND target=? AND claimed=0 AND expires_at>? RETURNING storage_key,size",
  )
    .bind(id, user.userId, transferTarget(request.url), Date.now())
    .first<{ storage_key: string; size: number }>();
  if (!r)
    throw new ApiError(
      404,
      "Upload expired or is unavailable. Please upload again.",
    );
  try {
    if (r.size > max) throw new ApiError(413, "Upload exceeds the size limit.");
    const head = await BUCKET.head(r.storage_key);
    if (!head || head.size !== r.size)
      throw new ApiError(400, "Uploaded file size does not match.");
    const object = await BUCKET.get(r.storage_key);
    if (!object) throw new ApiError(404, "Uploaded file is unavailable.");
    const reader = object.body.getReader();
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > max || length > r.size) {
        await reader.cancel();
        throw new ApiError(413, "Upload exceeds the size limit.");
      }
      chunks.push(value);
    }
    if (length !== r.size) throw new ApiError(400, "Incomplete upload.");
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    return bytes;
  } finally {
    await BUCKET.delete(r.storage_key);
    // Retain the claimed reservation until URL expiry to prevent immediate replay.
  }
}
