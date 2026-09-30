const key = "modeldrops:studio-draft:v1";
export function saveStudioDraft(characterId: string, prompt: string) {
  try {
    sessionStorage.setItem(
      key,
      JSON.stringify({
        characterId,
        prompt: prompt.slice(0, 4000),
        createdAt: Date.now(),
      }),
    );
  } catch {
    /* The character link still works when storage is disabled. */
  }
}
export function takeStudioDraft(characterId: string): string | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const draft = JSON.parse(raw);
    if (
      typeof draft.createdAt !== "number" ||
      Date.now() - draft.createdAt > 3600000 ||
      typeof draft.prompt !== "string" ||
      draft.prompt.length > 4000
    ) {
      sessionStorage.removeItem(key);
      return null;
    }
    if (draft.characterId !== characterId) return null;
    sessionStorage.removeItem(key);
    return draft.prompt;
  } catch {
    return null;
  }
}
