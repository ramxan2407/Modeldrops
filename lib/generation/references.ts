import { bindings, ApiError } from "@/lib/server";
export async function resolveImageReferences(
  input: Record<string, unknown>,
  userId: string,
) {
  const { DB, BUCKET } = bindings();
  const cache = new Map<string, string>();
  async function walk(value: unknown): Promise<unknown> {
    if (typeof value === "string" && value.startsWith("asset:")) {
      if (cache.has(value)) return cache.get(value)!;
      const row = await DB.prepare(
        "SELECT storage_key FROM generation_assets WHERE id=? AND user_id=? AND generation_id IS NULL",
      )
        .bind(value.slice(6), userId)
        .first<{ storage_key: string }>();
      if (!row)
        throw new ApiError(
          403,
          "Reference image is unavailable for this account.",
        );
      const bucket = BUCKET as R2Bucket & {
        signedRead?: (key: string) => Promise<string>;
      };
      if (!bucket.signedRead)
        throw new ApiError(503, "Private image delivery is not configured.");
      const url = await bucket.signedRead(row.storage_key);
      cache.set(value, url);
      return url;
    }
    if (Array.isArray(value)) return Promise.all(value.map(walk));
    if (value && typeof value === "object")
      return Object.fromEntries(
        await Promise.all(
          Object.entries(value).map(async ([k, v]) => [k, await walk(v)]),
        ),
      );
    return value;
  }
  return (await walk(input)) as Record<string, unknown>;
}
