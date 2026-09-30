import test from "node:test";
import assert from "node:assert/strict";
import { characters } from "../lib/catalog";
import {
  defaultStudioCharacter,
  studioCharacterLibrary,
} from "../lib/characters/studio-selection";

const catalog = characters.map((c) => ({
  ...c,
  referenceImage: "/approved.png",
  enabled: true,
}));
const purchases = [
  { characterId: "isla", purchaseDate: "2026-09-20T00:00:00.000Z" },
  { characterId: "valentina", purchaseDate: "2026-09-19T00:00:00.000Z" },
];

test("Studio selects the latest ready purchase without requiring a character URL", () => {
  const library = studioCharacterLibrary(
    catalog,
    ["valentina", "isla"],
    purchases,
  );
  assert.equal(defaultStudioCharacter(library, ""), "isla");
  assert.equal(
    defaultStudioCharacter(library, "valentina"),
    "valentina",
    "A valid explicit selection survives refresh and image/video switching",
  );
});

test("Studio excludes preview claims and unowned deep links", () => {
  const library = studioCharacterLibrary(catalog, ["valentina"], purchases);
  assert.deepEqual(
    library.map((c) => c.id),
    ["valentina"],
  );
  assert.equal(defaultStudioCharacter(library, "isla"), "valentina");
  assert.equal(defaultStudioCharacter(library, "nova"), "valentina");
});

test("Studio defaults to a ready permitted character but preserves a deliberate pending selection", () => {
  const restricted = catalog.map((c) =>
    c.id === "isla" ? { ...c, canGenerate: false } : c,
  );
  const pending = catalog.map((c) =>
    c.id === "isla" ? { ...c, referenceImage: undefined } : c,
  );
  for (const source of [restricted, pending]) {
    const library = studioCharacterLibrary(
      source,
      ["valentina", "isla"],
      purchases,
    );
    assert.equal(defaultStudioCharacter(library, ""), "valentina");
    assert.equal(defaultStudioCharacter(library, "isla"), "isla");
  }
});

test("Studio removes disabled, hidden and revoked characters without retaining another user's choice", () => {
  const disabled = catalog.map((c) =>
    c.id === "isla" ? { ...c, enabled: false } : c,
  );
  assert.deepEqual(
    studioCharacterLibrary(disabled, ["isla"]).map((c) => c.id),
    [],
  );
  assert.equal(
    defaultStudioCharacter(
      studioCharacterLibrary(
        catalog.filter((c) => c.id !== "isla"),
        ["isla"],
      ),
      "isla",
    ),
    "",
  );
  assert.equal(
    defaultStudioCharacter(studioCharacterLibrary(catalog, []), "valentina"),
    "",
  );
});

test("A purchased character with a pending portrait stays visible with generation blocked elsewhere", () => {
  const library = studioCharacterLibrary(characters, ["sora"]);
  assert.equal(defaultStudioCharacter(library, ""), "sora");
  assert.equal(library[0].referenceImage, undefined);
});
