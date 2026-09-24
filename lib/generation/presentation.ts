// Display only: retain original provider identifiers and historical records for routing/auditing.
// Do not apply to user-authored prompts, character names, or instructions.
export function generationMessage(value: string): string {
  return value
    .replace(/\b(?:higgsfield|wavespeed) generation\b/gi, "AI generation")
    .replace(/\b(?:higgsfield|wavespeed)\b/gi, "AI service");
}

export function generationModelLabel(value: string): string {
  return value.replace(/\b(?:higgsfield|wavespeed)(?:[-:]|\s)+/gi, "");
}
