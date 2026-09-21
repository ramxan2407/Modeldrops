export type RoleBindings = {
  ADMIN_USER_IDS?: string;
  SUPER_ADMIN_USER_IDS?: string;
};
export function superAdminIds(env: RoleBindings) {
  return (env.SUPER_ADMIN_USER_IDS || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}
export function administratorIds(env: RoleBindings) {
  return [
    ...new Set([
      ...(env.ADMIN_USER_IDS || "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
      ...superAdminIds(env),
    ]),
  ];
}
export function roleFor(env: RoleBindings, userId: string) {
  return superAdminIds(env).includes(userId)
    ? "super_admin"
    : administratorIds(env).includes(userId)
      ? "training_admin"
      : "user";
}
export function sameOrigin(request: Request) {
  return request.headers.get("origin") === new URL(request.url).origin;
}
