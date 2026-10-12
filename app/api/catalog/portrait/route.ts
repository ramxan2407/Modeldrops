import { catalogFor } from "@/lib/admin/service";
import { portraitVersionId, readVersion } from "@/lib/characters/versions";
import { bindings, ApiError, fail } from "@/lib/server";
export async function GET(request: Request) {
  try {
    const env = bindings(),
      id = new URL(request.url).searchParams.get("id");
    const c = (await catalogFor(env.DB)).find(
      (c) => c.id === id && c.enabled && c.approvalStatus === "approved",
    );
    const version = c
      ? await readVersion(env.DB, portraitVersionId(c) || "")
      : null;
    if (
      !c?.referenceAssetId ||
      !version?.approved ||
      !JSON.parse(version.reviewed_models).length
    )
      throw new ApiError(404, "Portrait unavailable.");
    const asset = await env.DB.prepare(
      "SELECT storage_key,mime FROM generation_assets WHERE id=? AND generation_id IS NULL",
    )
      .bind(c.referenceAssetId)
      .first<{ storage_key: string; mime: string }>();
    const object = asset && (await env.BUCKET.get(asset.storage_key));
    if (!asset || !object) throw new ApiError(404, "Portrait unavailable.");
    return new Response(object.body, {
      headers: {
        "Content-Type": asset.mime,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return fail(error);
  }
}
