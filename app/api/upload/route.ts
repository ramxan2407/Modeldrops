import { sameOrigin } from "@/lib/admin/policy";
import { auth, initialize, bindings, ApiError, fail, uid } from "@/lib/server";
export async function POST(request: Request) {
  try {
    if (!sameOrigin(request))
      throw new ApiError(403, "Cross-origin request rejected");
    const user = await auth();
    await initialize(user);
    if (Number(request.headers.get("content-length")) > 9 * 1024 * 1024)
      throw new ApiError(413, "Use an image smaller than 8 MB");
    const form = await request.formData();
    const file = form.get("file");
    if (
      !(file instanceof File) ||
      file.size > 8 * 1024 * 1024 ||
      file.size === 0
    )
      throw new ApiError(
        400,
        "Use a PNG, JPEG, or WebP image smaller than 8 MB",
      );
    const bytes = new Uint8Array(await file.arrayBuffer());
    const png =
      bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71;
    const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    const webp =
      new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
      new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
    const mime = png
      ? "image/png"
      : jpg
        ? "image/jpeg"
        : webp
          ? "image/webp"
          : null;
    if (!mime) throw new ApiError(400, "Unsupported image format");
    const { DB, BUCKET } = bindings();
    const n = await DB.prepare(
      "SELECT COUNT(*) AS n FROM generation_assets WHERE user_id=? AND generation_id IS NULL",
    )
      .bind(user.userId)
      .first<any>();
    if (n.n >= 50) throw new ApiError(429, "Preview reference limit reached");
    const id = uid(),
      storageKey = `private/${user.userId}/references/${id}`;
    await BUCKET.put(storageKey, bytes, {
      httpMetadata: { contentType: mime },
    });
    try {
      await DB.prepare(
        "INSERT INTO generation_assets(id,user_id,storage_key,mime,size) VALUES(?,?,?,?,?)",
      )
        .bind(id, user.userId, storageKey, mime, file.size)
        .run();
    } catch (e) {
      await BUCKET.delete(storageKey);
      throw e;
    }
    return Response.json({ id }, { status: 201 });
  } catch (e) {
    return fail(e);
  }
}
