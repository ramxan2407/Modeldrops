import { z } from "zod";
import { characters } from "../catalog";
import { roleFor, type RoleBindings } from "./policy";
export class AdminError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const text = z.string().trim().min(1).max(200);
const reason = z.string().trim().min(5).max(500);
const schemas = {
  user: z.object({ id: text, suspended: z.boolean(), reason }),
  credits: z.object({
    id: text,
    amount: z
      .number()
      .int()
      .min(-1000000)
      .max(1000000)
      .refine((n) => n !== 0),
    key: z.string().uuid(),
    reason,
  }),
  model: z.object({
    id: text,
    credits: z.number().int().min(1).max(10000),
    enabled: z.boolean(),
    reason,
  }),
  package: z.object({
    id: text,
    name: text,
    price: z.number().int().min(1).max(100000),
    credits: z.number().int().min(1).max(1000000),
    enabled: z.boolean(),
    reason,
  }),
  character: z.object({
    id: text,
    price: z.number().int().min(0).max(100000),
    enabled: z.boolean(),
    featured: z.boolean(),
    reason,
  }),
  listing: z.object({
    id: z.string().uuid(),
    status: z.enum(["approved", "rejected", "suspended"]),
    reason,
  }),
  report: z.object({
    id: z.string().uuid(),
    status: z.enum(["resolved", "dismissed"]),
    reason,
  }),
};
export const adminSections = [
  "overview",
  "users",
  "credits",
  "payments",
  "models",
  "characters",
  "moderation",
  "activity",
  "integrations",
] as const;
export type AdminSection = (typeof adminSections)[number];
export async function catalogFor(db: D1Database) {
  const rows = await db.prepare("SELECT * FROM character_controls").all<any>();
  return characters.map((c) => {
    const r = rows.results.find((r) => r.id === c.id);
    return {
      ...c,
      enabled: r ? !!r.enabled : true,
      featured: r ? !!r.featured : c.badge === "FEATURED",
      price: r ? r.price : c.price,
      badge: r ? (r.featured ? "FEATURED" : undefined) : c.badge,
    };
  });
}
export class AdminService {
  constructor(
    public db: D1Database,
    public roles: RoleBindings,
    public actor: string,
  ) {}
  guard() {
    if (roleFor(this.roles, this.actor) !== "super_admin")
      throw new AdminError(403, "Super administrator access required.");
  }
  async state(section: AdminSection, search = "", page = 0) {
    this.guard();
    if (
      !adminSections.includes(section) ||
      !Number.isSafeInteger(page) ||
      page < 0 ||
      page > 100000 ||
      search.length > 120
    )
      throw new AdminError(400, "Invalid dashboard filter.");
    const limit = 25,
      offset = page * limit;
    const match = "%" + search.replace(/[\\%_]/g, "\\$&") + "%";
    const list = async (sql: string, values: unknown[] = []) =>
      (
        await this.db
          .prepare(sql)
          .bind(...values)
          .all<any>()
      ).results;
    const paged = async (sql: string, values: unknown[] = []) => {
      const rows = await list(sql + " LIMIT ? OFFSET ?", [
        ...values,
        limit + 1,
        offset,
      ]);
      return { rows: rows.slice(0, limit), hasMore: rows.length > limit, page };
    };
    switch (section) {
      case "overview": {
        const metrics = await this.db
          .prepare(
            `SELECT (SELECT COUNT(*) FROM users) users, (SELECT COUNT(*) FROM users WHERE suspended=1) suspended, (SELECT COALESCE(SUM(amount),0) FROM credit_transactions) credits, (SELECT COUNT(*) FROM generations) generations, (SELECT COUNT(*) FROM generations WHERE status='failed') failed, (SELECT COUNT(*) FROM training_requests WHERE status NOT IN ('draft','completed','rejected')) training, (SELECT COUNT(*) FROM reports WHERE status='open') reports, (SELECT COUNT(*) FROM creator_listings WHERE status='pending_review') submissions`,
          )
          .first();
        return { metrics };
      }
      case "users":
        return {
          ...(await paged(
            `SELECT u.id,u.name,u.email,u.suspended,u.created_at,COALESCE((SELECT SUM(amount) FROM credit_transactions WHERE user_id=u.id),0) balance, (SELECT COUNT(*) FROM generations WHERE user_id=u.id) generations FROM users u WHERE (u.name LIKE ? ESCAPE '\\' OR u.email LIKE ? ESCAPE '\\' OR u.id LIKE ? ESCAPE '\\') ORDER BY u.created_at DESC,u.id`,
            [match, match, match],
          )),
          roles: this.rolesSummary(),
        };
      case "credits":
        return paged(
          `SELECT t.*,u.email FROM credit_transactions t JOIN users u ON u.id=t.user_id WHERE (u.email LIKE ? ESCAPE '\\' OR t.user_id LIKE ? ESCAPE '\\') ORDER BY t.created_at DESC,t.id`,
          [match, match],
        );
      case "payments":
        return {
          ...(await paged(
            `SELECT p.*,u.email FROM character_purchases p JOIN users u ON u.id=p.user_id WHERE u.email LIKE ? ESCAPE '\\' ORDER BY p.created_at DESC,p.id`,
            [match],
          )),
          packages: await list(
            "SELECT * FROM credit_packages ORDER BY price,id",
          ),
          connected: false,
        };
      case "models":
        return {
          rows: await list(
            "SELECT id,name,provider,type,credits,enabled FROM ai_models ORDER BY type,name",
          ),
        };
      case "characters":
        return { rows: await catalogFor(this.db) };
      case "moderation":
        return {
          ...(await paged(
            `SELECT l.*,u.email FROM creator_listings l JOIN users u ON u.id=l.user_id WHERE l.status='pending_review' ORDER BY l.created_at,l.id`,
          )),
          reports: await list(
            "SELECT r.*,u.email FROM reports r JOIN users u ON u.id=r.user_id WHERE r.status='open' ORDER BY r.created_at,r.id LIMIT 100",
          ),
        };
      case "activity":
        return paged(
          `SELECT a.*,u.email FROM audit_logs a JOIN users u ON u.id=a.actor_id WHERE (a.action LIKE ? ESCAPE '\\' OR a.entity_id LIKE ? ESCAPE '\\' OR u.email LIKE ? ESCAPE '\\') ORDER BY a.created_at DESC,a.id`,
          [match, match, match],
        );
      default:
        return {};
    }
  }
  rolesSummary() {
    return Object.fromEntries(
      [
        ...new Set([
          ...(this.roles.ADMIN_USER_IDS || "").split(","),
          ...(this.roles.SUPER_ADMIN_USER_IDS || "").split(","),
        ]),
      ]
        .map((s) => s.trim())
        .filter(Boolean)
        .map((id) => [id, roleFor(this.roles, id)]),
    );
  }
  async mutate(action: string, input: unknown) {
    this.guard();
    const schema = schemas[action as keyof typeof schemas];
    if (!schema) throw new AdminError(400, "Unknown administration action.");
    const parsed = schema.safeParse(input);
    if (!parsed.success)
      throw new AdminError(400, parsed.error.issues[0].message);
    const d = parsed.data as any;
    const audit = () =>
      this.db
        .prepare(
          "INSERT INTO audit_logs(id,actor_id,action,entity_id,metadata) VALUES(?,?,?,?,?)",
        )
        .bind(
          crypto.randomUUID(),
          this.actor,
          "admin." + action,
          d.id,
          JSON.stringify(d),
        );
    const find = async (table: string) => {
      const row = await this.db
        .prepare(`SELECT * FROM ${table} WHERE id=?`)
        .bind(d.id)
        .first<any>();
      if (!row)
        throw new AdminError(404, "Record not found. Refresh the dashboard.");
      return row;
    };
    switch (action) {
      case "user": {
        await find("users");
        if (d.id === this.actor || roleFor(this.roles, d.id) !== "user")
          throw new AdminError(
            409,
            "Administrator accounts are protected. Manage administrator access in server configuration.",
          );
        await this.db.batch([
          this.db
            .prepare("UPDATE users SET suspended=? WHERE id=?")
            .bind(+d.suspended, d.id),
          audit(),
        ]);
        break;
      }
      case "credits": {
        await find("users");
        const key = `admin:${this.actor}:${d.key}`;
        const replay = async () => {
          const prior = await this.db
            .prepare(
              "SELECT user_id,amount,description FROM credit_transactions WHERE idempotency_key=?",
            )
            .bind(key)
            .first<any>();
          if (!prior) return false;
          if (
            prior.user_id !== d.id ||
            prior.amount !== d.amount ||
            prior.description !== d.reason
          )
            throw new AdminError(
              409,
              "This adjustment key was already used for a different change.",
            );
          return true;
        };
        if (await replay()) return { ok: true, replayed: true };
        try {
          await this.db.batch([
            this.db
              .prepare(
                `INSERT INTO credit_transactions(id,user_id,amount,type,description,balance_before,balance_after,idempotency_key) SELECT ?,?,?,'admin_adjustment',?,COALESCE(SUM(amount),0),COALESCE(SUM(amount),0)+?,? FROM credit_transactions WHERE user_id=?`,
              )
              .bind(
                crypto.randomUUID(),
                d.id,
                d.amount,
                d.reason,
                d.amount,
                key,
                d.id,
              ),
            audit(),
            this.db
              .prepare(
                "INSERT INTO notifications(id,user_id,message) VALUES(?,?,?)",
              )
              .bind(
                crypto.randomUUID(),
                d.id,
                `Your credits were adjusted by ${d.amount > 0 ? "+" : ""}${d.amount}. ${d.reason}`,
              ),
          ]);
        } catch (e) {
          if (await replay()) return { ok: true, replayed: true };
          if (
            e instanceof Error &&
            /balance_nonnegative|CHECK constraint/.test(e.message)
          )
            throw new AdminError(
              409,
              "This adjustment would make the credit balance negative.",
            );
          throw e;
        }
        break;
      }
      case "model":
        await find("ai_models");
        await this.db.batch([
          this.db
            .prepare("UPDATE ai_models SET credits=?,enabled=? WHERE id=?")
            .bind(d.credits, +d.enabled, d.id),
          audit(),
        ]);
        break;
      case "package":
        await find("credit_packages");
        await this.db.batch([
          this.db
            .prepare(
              "UPDATE credit_packages SET name=?,price=?,credits=?,enabled=? WHERE id=?",
            )
            .bind(d.name, d.price, d.credits, +d.enabled, d.id),
          audit(),
        ]);
        break;
      case "character": {
        if (!characters.some((c) => c.id === d.id))
          throw new AdminError(404, "Character not found.");
        await this.db.batch([
          this.db
            .prepare(
              "INSERT INTO character_controls(id,price,enabled,featured) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET price=excluded.price,enabled=excluded.enabled,featured=excluded.featured",
            )
            .bind(d.id, d.price, +d.enabled, +d.featured),
          audit(),
        ]);
        break;
      }
      case "listing": {
        await find("creator_listings");
        await this.db.batch([
          this.db
            .prepare("UPDATE creator_listings SET status=? WHERE id=?")
            .bind(d.status, d.id),
          audit(),
          this.db
            .prepare(
              "INSERT INTO notifications(id,user_id,message) SELECT ?,user_id,? FROM creator_listings WHERE id=?",
            )
            .bind(
              crypto.randomUUID(),
              `Your character submission was ${d.status}. ${d.reason}`,
              d.id,
            ),
        ]);
        break;
      }
      case "report":
        await find("reports");
        await this.db.batch([
          this.db
            .prepare("UPDATE reports SET status=? WHERE id=?")
            .bind(d.status, d.id),
          audit(),
        ]);
        break;
    }
    return { ok: true };
  }
}
