export async function characterAllowed(
  db: D1Database,
  userId: string,
  characterId: string,
  action: "view" | "generate" = "view",
) {
  const { results } = await db
    .prepare(
      "SELECT can_view,can_generate FROM character_permissions WHERE user_id=? AND character_id IN (?, '*')",
    )
    .bind(userId, characterId)
    .all<{ can_view: number; can_generate: number }>();
  return results.every(
    (p) =>
      Boolean(p.can_view) && (action === "view" || Boolean(p.can_generate)),
  );
}
export async function visibleCharacters<
  T extends { id: string; enabled: boolean },
>(db: D1Database, userId: string, catalog: T[]) {
  const { results } = await db
    .prepare(
      "SELECT character_id,can_view,can_generate FROM character_permissions WHERE user_id=?",
    )
    .bind(userId)
    .all<{ character_id: string; can_view: number; can_generate: number }>();
  return catalog
    .filter(
      (c) =>
        c.enabled &&
        results
          .filter((p) => p.character_id === "*" || p.character_id === c.id)
          .every((p) => Boolean(p.can_view)),
    )
    .map((c) => ({
      ...c,
      canGenerate: results
        .filter((p) => p.character_id === "*" || p.character_id === c.id)
        .every((p) => Boolean(p.can_view) && Boolean(p.can_generate)),
    }));
}
