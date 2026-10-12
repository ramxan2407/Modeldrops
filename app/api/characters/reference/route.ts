import {
  readVersion,
  purchasedVersion,
  versionCharacter,
} from "@/lib/characters/versions";
import { characterAccess } from "@/lib/characters/access";
import { auth, bindings, ApiError, fail, isSuperAdmin } from "@/lib/server";
import { catalogFor } from "@/lib/admin/service";
import { characterAllowed } from "@/lib/admin/character-permissions";
export async function GET(request: Request) {
  try {
    const user = await auth();
    const { DB, BUCKET } = bindings();
    const id = new URL(request.url).searchParams.get("id");
    let c = (await catalogFor(DB)).find((c) => c.id === id);
    const requestedVersion = new URL(request.url).searchParams.get("version");
    if (requestedVersion && c) {
      const version = await readVersion(DB, requestedVersion);
      const owned = await purchasedVersion(DB, user.userId, c.id);
      if (
        !version ||
        version.character_id !== c.id ||
        (!isSuperAdmin(user.userId) &&
          (!version.approved ||
            owned?.id !== version.id ||
            !(await characterAccess(DB, user.userId, c.id, bindings()))))
      )
        throw new ApiError(404, "Portrait unavailable.");
      c = {
        ...c,
        ...versionCharacter(version),
        approvalStatus: version.approved ? "approved" : "pending",
      };
    }
    if (
      !c ||
      (!isSuperAdmin(user.userId) &&
        (c.approvalStatus !== "approved" ||
          !c.enabled ||
          !(await characterAllowed(DB, user.userId, c.id))))
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
