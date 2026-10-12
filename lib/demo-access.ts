import { demoEnabled, type DemoEnvironment } from "./credits";
import { roleFor, type RoleBindings } from "./admin/policy";

/** Registration has no authenticated role; only the explicit email invitation counts. */
export async function demoSignupAllowed(
  db: D1Database | undefined,
  env: DemoEnvironment,
  email: string | undefined,
) {
  if (!demoEnabled(env)) return true;
  if (!db || !email?.trim()) return false;
  return !!(await db
    .prepare("SELECT email FROM demo_testers WHERE email=? AND enabled=1")
    .bind(email.trim().toLowerCase())
    .first());
}

export async function demoAccessAllowed(
  db: D1Database,
  env: DemoEnvironment & RoleBindings,
  user: { userId: string; email?: string },
) {
  if (!demoEnabled(env) || roleFor(env, user.userId) !== "user") return true;
  return demoSignupAllowed(db, env, user.email);
}
