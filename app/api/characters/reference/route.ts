import { auth, bindings, ApiError, fail, isSuperAdmin } from "@/lib/server";
import { catalogFor } from "@/lib/admin/service";
import { characterAllowed } from "@/lib/admin/character-permissions";
export async function GET(request: Request) {
  try {
    const user = await auth();
    const { DB, BUCKET } = bindings();
    const id = new URL(request.url).searchParams.get("id");
    const c = (await catalogFor(DB)).find((c) => c.id === id);
    if (
      !c ||
      (!isSuperAdmin(user.userId) &&
        (!c.enabled || !(await characterAllowed(DB, user.userId, c.id))))
    )
      throw new ApiError(404, "Character unavailable.");
    if (!c.referenceAssetId)
      throw new ApiError(404, "Character reference not ready.");
    const asset = await DB.prepare(
      "SELECT storage_key,mime FROM generation_assets WHERE id=? AND generation_id IS NULL",
    )
      .bind(c.referenceAssetId)
      .first<{ storage_key: string; mime: string }>();
    const object = asset && (await BUCKET.get(asset.storage_key));
    if (!object || !asset)
      throw new ApiError(404, "Character reference unavailable.");
    return new Response(object.body, {
      headers: {
        "Content-Type": asset.mime,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    return fail(e);
  }
}
