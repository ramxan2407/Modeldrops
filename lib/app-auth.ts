import { cookies } from "next/headers";
import { supabaseServer } from "./supabase/server";
import {
  authCookieName,
  loginMethodCookie,
  verifiedSupabaseIdentity,
} from "./auth-policy";

export async function getAppUser() {
  const jar = await cookies();
  const usesSupabase =
    jar.get(loginMethodCookie)?.value === "supabase" ||
    jar
      .getAll()
      .some(
        (c) =>
          c.name === authCookieName || c.name.startsWith(authCookieName + "."),
      );
  if (usesSupabase) {
    const client = await supabaseServer();
    if (!client) return null;
    try {
      const { data, error } = await client.auth.getUser();
      if (error) return null;
      return verifiedSupabaseIdentity(data.user);
    } catch {
      return null;
    }
  }
  return null;
}
