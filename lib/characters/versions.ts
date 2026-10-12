import { characters, type Character } from "../catalog";
import { characterReferenceVersion } from "./reference-version";

export const portraitVersionId = (c: Character) => {
  const reference = characterReferenceVersion(c);
  return reference ? `${c.id}@${reference}` : null;
};
export type VersionRow = {
  id: string;
  character_id: string;
  profile: string;
  approved: number;
  reviewed_models: string;
};
export async function readVersion(db: D1Database, id: string) {
  return db
    .prepare("SELECT * FROM character_versions WHERE id=?")
    .bind(id)
    .first<VersionRow>();
}
export function versionCharacter(
  row: VersionRow,
): Character & { versionId: string; offeredModelIds: string[] } {
  const base = characters.find((c) => c.id === row.character_id)!;
  const profile = JSON.parse(row.profile) as Partial<Character>;
  const image = profile.referenceAssetId
    ? `/api/characters/reference?id=${encodeURIComponent(row.character_id)}&version=${encodeURIComponent(row.id)}`
    : profile.referenceImage || base.image;
  return {
    ...base,
    ...profile,
    id: row.character_id,
    versionId: row.id,
    offeredModelIds: JSON.parse(row.reviewed_models),
    approvalStatus: row.approved ? "approved" : "pending",
    badge: row.approved ? "AVAILABLE" : "PENDING REVIEW",
    referenceImage: image,
    image,
  };
}
export async function purchasedVersion(
  db: D1Database,
  userId: string,
  characterId: string,
) {
  return db
    .prepare(
      "SELECT v.* FROM character_versions v JOIN character_entitlements e ON e.version_id=v.id WHERE e.user_id=? AND e.character_id=? AND e.status='active'",
    )
    .bind(userId, characterId)
    .first<VersionRow>();
}
export function draftVersionStatement(db: D1Database, character: Character) {
  const id = portraitVersionId(character);
  if (!id) throw new Error("A portrait is required.");
  return db
    .prepare(
      "INSERT OR IGNORE INTO character_versions(id,character_id,profile,created_at) VALUES(?,?,?,?)",
    )
    .bind(
      id,
      character.id,
      JSON.stringify(character),
      new Date().toISOString(),
    );
}
