import { demoEnabled, type DemoEnvironment } from "./credits";
import { roleFor, type RoleBindings } from "./admin/policy";

export async function demoAccessAllowed(
  db: D1Database,
  env: DemoEnvironment & RoleBindings,
  user: { userId: string; email?: string },
) {
  if (!demoEnabled(env) || roleFor(env, user.userId) !== "user") return true;
  if (!user.email) return false;
  return !!(await db
    .prepare("SELECT email FROM demo_testers WHERE email=? AND enabled=1")
    .bind(user.email.trim().toLowerCase())
    .first());
}
