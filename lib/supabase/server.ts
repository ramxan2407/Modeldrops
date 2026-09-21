import { createAuthClient } from "./client-factory";
import { cookies } from "next/headers";
import { supabaseConfig } from "./config";

export async function supabaseServer() {
  const config = supabaseConfig();
  if (!config) return null;
  const jar = await cookies();
  return createAuthClient(config, {
    getAll: () => jar.getAll(),
    setAll: (values) => {
      // Server Components cannot write cookies; proxy.ts refreshes them first.
      try {
        for (const { name, value, options } of values)
          jar.set(name, value, options);
      } catch {}
    },
  });
}
