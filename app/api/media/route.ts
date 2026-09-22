import { auth, bindings, ApiError, fail } from "@/lib/server";
export async function GET(request: Request) {
  try {
    const user = await auth();
    const { DB, BUCKET } = bindings();
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const row = await DB.prepare(
      "SELECT asset_key FROM generations WHERE id=? AND user_id=? AND status='completed'",
    )
      .bind(id, user.userId)
      .first<{ asset_key: string }>();
    if (!row?.asset_key) throw new ApiError(404, "Asset not found");
    const object = await BUCKET.get(row.asset_key);
    if (!object) throw new ApiError(404, "Asset unavailable");
    const mime = object.httpMetadata?.contentType || "image/png";
    const extension =
      (
        {
          "image/png": "png",
          "image/jpeg": "jpg",
          "image/webp": "webp",
          "video/mp4": "mp4",
          "video/webm": "webm",
        } as Record<string, string>
      )[mime] || "bin";
    return new Response(object.body, {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": `${url.searchParams.has("download") ? "attachment" : "inline"}; filename="model-drops-${id}.${extension}"`,
      },
    });
  } catch (e) {
    return fail(e);
  }
}
