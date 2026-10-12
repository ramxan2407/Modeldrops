import {
  draftVersionStatement,
  portraitVersionId,
  purchasedVersion,
  readVersion,
  versionCharacter,
} from "../characters/versions";
import { characterReferenceVersion } from "../characters/reference-version";
import { characterAllowed } from "../admin/character-permissions";
import { catalogFor } from "../admin/service";
import { characterAccess } from "../characters/access";
import { ApiError, bindings, isSuperAdmin } from "../server";
import { imageDefinition } from "./images";

/** Resolve the owned catalog identity on the server; never trust a client portrait URL. */
export async function resolveCharacterReferenceInputs(
  db: D1Database,
  userId: string,
  characterId: string,
  modelId: string,
  inputs: Record<string, unknown>,
  origin: string,
  options: { versionId?: string | null; qa?: boolean } = {},
): Promise<{
  inputs: Record<string, unknown>;
  reference: string;
  versionId: string;
}> {
  if (!(await characterAllowed(db, userId, characterId, "generate")))
    throw new ApiError(
      403,
      "Character generation access is restricted for your account.",
    );
  const current = (await catalogFor(db)).find(
    (c) => c.id === characterId && c.enabled,
  );
  if (!current) throw new ApiError(400, "This model drop is unavailable.");
  if (
    !options.qa &&
    !(await characterAccess(db, userId, characterId, bindings()))
  )
    throw new ApiError(
      403,
      "Unlock this model before generating with her. Preview claims do not include generation access.",
    );
  if (options.qa && !isSuperAdmin(userId))
    throw new ApiError(
      403,
      "Only super administrators can test candidate portraits.",
    );
  if (options.qa && !options.versionId && current.referenceAssetId)
    await draftVersionStatement(db, current).run();
  const version = options.versionId
    ? await readVersion(db, options.versionId)
    : options.qa
      ? await readVersion(db, portraitVersionId(current) || "")
      : (await purchasedVersion(db, userId, characterId)) ||
        (await readVersion(db, portraitVersionId(current) || ""));
  if (
    !version ||
    version.character_id !== characterId ||
    (!options.qa && !version.approved)
  )
    throw new ApiError(
      409,
      "Your character needs a reviewed portrait version. Contact an administrator.",
    );
  const character = versionCharacter(version);
  if (
    !options.qa &&
    character.offeredModelIds.length &&
    !character.offeredModelIds.includes(modelId)
  )
    throw new ApiError(
      409,
      "This generation model has not been reviewed for your character version.",
    );
  if (!character.referenceImage)
    throw new ApiError(
      409,
      "This model's portrait is not ready. Generation opens when her drop launches. No credits were charged.",
    );
  const definition = imageDefinition(modelId);
  if (!definition && modelId !== "wavespeed-kling-3")
    throw new ApiError(
      400,
      "Choose a generation model that supports character references.",
    );
  let url = new URL(character.referenceImage, origin).href;
  if (character.referenceAssetId) {
    const asset = await db
      .prepare(
        "SELECT storage_key FROM generation_assets WHERE id=? AND generation_id IS NULL",
      )
      .bind(character.referenceAssetId)
      .first<{ storage_key: string }>();
    const bucket = bindings().BUCKET as R2Bucket & {
      signedRead?: (key: string) => Promise<string>;
    };
    if (!asset || !bucket.signedRead)
      throw new ApiError(
        503,
        "Character reference delivery is unavailable. No credits were charged.",
      );
    url = await bucket.signedRead(asset.storage_key);
  }
  // Reference identity comes exclusively from the approved catalog asset.
  const settings = Object.fromEntries(
    Object.entries(inputs).filter(
      ([key]) =>
        !["image", "images", "end_image", "element_list"].includes(key),
    ),
  );
  return {
    reference: characterReferenceVersion(character)!,
    versionId: version.id,
    inputs: definition?.endpoint.startsWith("openai/")
      ? { ...settings, images: [url] }
      : { ...settings, image: url },
  };
}

export async function characterReferenceInputs(
  ...args: Parameters<typeof resolveCharacterReferenceInputs>
) {
  return (await resolveCharacterReferenceInputs(...args)).inputs;
}
