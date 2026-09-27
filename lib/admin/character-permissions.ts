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
  const allowed = await Promise.all(
    catalog.map((c) => characterAllowed(db, userId, c.id)),
  );
  const visible = catalog.filter((c, i) => c.enabled && allowed[i]);
  return Promise.all(
    visible.map(async (c) => ({
      ...c,
      canGenerate: await characterAllowed(db, userId, c.id, "generate"),
    })),
  );
}
