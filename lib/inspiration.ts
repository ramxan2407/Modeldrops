import { characters } from "./catalog";

export const inspirationStyles = [
  {
    id: "cinematic",
    name: "Cinematic",
    detail:
      "Golden-hour light, subtle film grain, atmospheric depth, cinematic composition",
  },
  {
    id: "editorial",
    name: "Editorial",
    detail:
      "Soft studio lighting, a minimal backdrop, refined styling, editorial portrait composition",
  },
  {
    id: "dreamlike",
    name: "Dreamlike",
    detail:
      "Soft pastel light, an ethereal environment, delicate textures, imaginative composition",
  },
] as const;

/** Only curated IDs cross the sign-in boundary; this never submits a generation. */
export function inspirationPrompt(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 100) return null;
  const parts = value.split(".");
  if (parts.length !== 2) return null;
  const character = characters.find((c) => c.id === parts[0]);
  const style = inspirationStyles.find((s) => s.id === parts[1]);
  if (!character || !style) return null;
  return `${/^[aeiou]/i.test(character.category) ? "An" : "A"} ${character.category.toLowerCase()} character portrait inspired by ${character.name}: ${character.description} ${style.detail}. No text or logos.`;
}
