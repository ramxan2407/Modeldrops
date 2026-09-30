import type { Character } from "../catalog";

type CatalogCharacter = Character & { enabled?: boolean };

/** Use server-verified access, never legacy preview claims or the public catalog alone. */
export function studioCharacterLibrary(
  catalog: CatalogCharacter[],
  accessibleIds: readonly string[],
  purchases: readonly { characterId: string; purchaseDate: string }[] = [],
) {
  const access = new Set(accessibleIds);
  const dates = new Map(purchases.map((p) => [p.characterId, p.purchaseDate]));
  return catalog
    .filter((c) => c.enabled !== false && access.has(c.id))
    .sort((a, b) =>
      (dates.get(b.id) || "").localeCompare(dates.get(a.id) || ""),
    );
}

export function defaultStudioCharacter(
  library: CatalogCharacter[],
  requested: string,
) {
  if (library.some((c) => c.id === requested)) return requested;
  return (
    library.find((c) => c.canGenerate !== false && c.referenceImage)?.id ||
    library[0]?.id ||
    ""
  );
}
