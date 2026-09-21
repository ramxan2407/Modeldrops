import { safeWorkspaceReturnTo } from "./navigation";

export const authCookieName = "md-auth";
export const loginMethodCookie = "md-login-method";
export function verifiedSupabaseIdentity(
  user: {
    id: string;
    email?: string;
    email_confirmed_at?: string;
    user_metadata?: Record<string, unknown>;
  } | null,
) {
  if (
    !user ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      user.id,
    ) ||
    !user.email ||
    !user.email_confirmed_at
  )
    return null;
  const name =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name.slice(0, 100)
      : null;
  return {
    userId: `supabase:${user.id}`,
    email: user.email,
    fullName: name,
    displayName: name || user.email,
    provider: "supabase" as const,
  };
}
export function isSameOriginAuthRequest(request: Request) {
  return request.headers.get("origin") === new URL(request.url).origin;
}
export function authDestination(value: unknown) {
  return safeWorkspaceReturnTo(value);
}
