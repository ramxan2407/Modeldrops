export const workspaceSections = [
  "dashboard",
  "discover",
  "studio",
  "marketplace",
  "characters",
  "explore",
  "projects",
  "library",
  "favorites",
  "creators",
  "billing",
  "settings",
  "admin",
  "train-lora",
  "my-loras",
  "admin-training",
] as const;
export type WorkspaceSection = (typeof workspaceSections)[number];
export function isWorkspaceSection(value: string): value is WorkspaceSection {
  return (workspaceSections as readonly string[]).includes(value);
}
export function safeWorkspaceReturnTo(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//")
  )
    return "/dashboard";
  try {
    const url = new URL(value, "https://modeldrops.local");
    if (
      url.origin !== "https://modeldrops.local" ||
      url.hash ||
      !isWorkspaceSection(url.pathname.slice(1))
    )
      return "/dashboard";
    // Preserve only the optional character selection; never forward arbitrary redirects.
    const character = url.searchParams.get("character");
    return (
      url.pathname +
      (character && /^[a-z0-9-]{1,80}$/.test(character)
        ? "?character=" + encodeURIComponent(character)
        : "")
    );
  } catch {
    return "/dashboard";
  }
}
