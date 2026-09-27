import { catalogFor } from "../admin/service";
import { ApiError } from "../server";
import { imageDefinition } from "./images";

/** Resolve the owned catalog identity on the server; never trust a client portrait URL. */
export async function characterReferenceInputs(
  db: D1Database,
  userId: string,
  characterId: string,
  modelId: string,
  inputs: Record<string, unknown>,
  origin: string,
) {
  const character = (await catalogFor(db)).find(
    (c) => c.id === characterId && c.enabled,
  );
  if (!character) throw new ApiError(400, "This model drop is unavailable.");
  const owned = await db
    .prepare(
      "SELECT id,price_cents,license_version FROM character_purchases WHERE user_id=? AND character_id=? AND status='active'",
    )
    .bind(userId, characterId)
    .first<{ id: string; price_cents: number; license_version: string }>();
  if (!owned)
    throw new ApiError(403, "Unlock this model before generating with her.");
  if (Number(owned.price_cents) <= 0 || owned.license_version === "demo-1")
    throw new ApiError(
      403,
      "Preview access does not unlock model generation. Paid model access is not available yet.",
    );
  if (!character.referenceImage)
    throw new ApiError(
      409,
      "This model's portrait is not ready. Generation opens when her drop launches. No credits were charged.",
    );
  const definition = imageDefinition(modelId);
  if (!definition)
    throw new ApiError(
      400,
      "Character identity is supported in image editing only. Video character references are not connected yet.",
    );
  const url = new URL(character.referenceImage, origin).href;
  // Replace all identity references so a selected character cannot silently become a different person.
  const { image: _image, images: _images, ...settings } = inputs;
  return definition.endpoint.startsWith("openai/")
    ? { ...settings, images: [url] }
    : { ...settings, image: url };
}
