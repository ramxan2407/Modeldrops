/** An immutable upload ID (or versioned bundled image) identifies the approved portrait. */
export function characterReferenceVersion(character: {
  referenceAssetId?: string | null;
  referenceImage?: string;
}) {
  return character.referenceAssetId
    ? `asset:${character.referenceAssetId}`
    : character.referenceImage
      ? `image:${character.referenceImage}`
      : null;
}
