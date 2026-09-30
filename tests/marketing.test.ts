import test from "node:test";
import assert from "node:assert/strict";
import { filterTalent, talent } from "../lib/marketing/catalog";
import { characters } from "../lib/catalog";
import {
  saveStudioDraft,
  takeStudioDraft,
} from "../lib/characters/studio-draft";

test("Public catalog preserves live character IDs and never invents portfolios or popularity", () => {
  assert.deepEqual(
    talent.map((m) => m.id),
    characters.map((m) => m.id),
  );
  assert(
    talent.every(
      (m) => m.slug === m.id && m.gallery.length === 0 && !m.popular,
    ),
  );
  assert.deepEqual(filterTalent(talent, "", "Popular"), []);
  assert.deepEqual(filterTalent(talent, "", "Men"), []);
  assert.equal(filterTalent(talent, "", "Women").length, 5);
});
test("Marketplace search and category filters combine and clear correctly", () => {
  assert.deepEqual(
    filterTalent(talent, "  AMARA ", "Beauty").map((m) => m.id),
    ["amara-rose"],
  );
  assert.equal(filterTalent(talent, "amara", "Editorial").length, 0);
  assert.equal(filterTalent(talent, "", "All").length, 5);
});
test("A profile draft follows only its character and is consumed once", () => {
  const descriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "sessionStorage",
  );
  const data = new Map<string, string>();
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => data.get(k) || null,
      setItem: (k: string, v: string) => data.set(k, v),
      removeItem: (k: string) => data.delete(k),
    },
  });
  try {
    saveStudioDraft("sora", "A campaign in a quiet studio.");
    assert.equal(takeStudioDraft("valentina"), null);
    assert.equal(takeStudioDraft("sora"), "A campaign in a quiet studio.");
    assert.equal(takeStudioDraft("sora"), null);
    saveStudioDraft("sora", "x".repeat(5000));
    assert.equal(takeStudioDraft("sora")?.length, 4000);
    saveStudioDraft("sora", "Expired draft");
    for (const [key, value] of data)
      data.set(
        key,
        JSON.stringify({
          ...JSON.parse(value),
          createdAt: Date.now() - 3600001,
        }),
      );
    assert.equal(takeStudioDraft("sora"), null);
  } finally {
    if (descriptor)
      Object.defineProperty(globalThis, "sessionStorage", descriptor);
    else Reflect.deleteProperty(globalThis, "sessionStorage");
  }
});
