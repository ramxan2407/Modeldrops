import { env } from "cloudflare:workers";
import { catalogFor } from "../admin/service";
import { portraitVersionId, readVersion } from "../characters/versions";
import { toTalent } from "./catalog";
import { demoEnabled } from "../credits";

export async function publicCatalog() {
  const runtime = env as unknown as { DB?: D1Database; DEMO_MODE?: string };
  if (!runtime.DB) return [];
  const catalog = await catalogFor(runtime.DB);
  const items = await Promise.all(
    catalog.map(async (c, index) => {
      const id = portraitVersionId(c),
        version = id ? await readVersion(runtime.DB!, id) : null;
      if (
        !c.enabled ||
        c.approvalStatus !== "approved" ||
        !version?.approved ||
        !JSON.parse(version.reviewed_models).length
      )
        return null;
      const image = `/api/catalog/portrait?id=${encodeURIComponent(c.id)}`;
      // Explicit public projection; no private storage keys or asset IDs.
      const safe = { ...c };
      delete safe.referenceAssetId;
      delete safe.referenceImage;
      return {
        ...toTalent({ ...safe, image }, index),
        accessType: demoEnabled(runtime) ? "Demo access" : "Reviewed character",
      };
    }),
  );
  return items.filter((c): c is NonNullable<typeof c> => c !== null);
}
