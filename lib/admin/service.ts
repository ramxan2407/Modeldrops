import { qualityApprovalStatements } from "../characters/quality";
import {
  draftVersionStatement,
  portraitVersionId,
  readVersion,
} from "../characters/versions";
import { activeWallet, defaultCharacterCredits } from "../credits";
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
const profile = z.object({
  name: text,
  description: z.string().trim().min(1).max(2000),
  age: z.number().int().min(18).max(100),
  category: text,
  demoCreditPrice: z.number().int().min(1).max(100000).optional(),
  approvalStatus: z.enum(["pending", "approved", "rejected"]).optional(),
  referenceAssetId: z.string().uuid().nullable().optional(),
});
const schemas = {
  tester: z.object({ id: z.string().email(), enabled: z.boolean(), reason }),
  character_permission: z.object({
    id: text,
    characterId: text,
    canView: z.boolean(),
    canGenerate: z.boolean(),
    reason,
  }),
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
    profile: profile.optional(),
    reviewedGenerationIds: z.array(z.string().uuid()).max(20).default([]),
    fictionalAdultConfirmed: z.literal(true).optional(),
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
  const rows = await db.prepare("SELECT * FROM character_controls").all<{
    id: string;
    profile: string | null;
    enabled: number;
    featured: number;
    price: number;
  }>();
  return characters.map((c) => {
    const r = rows.results.find((r) => r.id === c.id);
    const managed: Partial<z.infer<typeof profile>> = r?.profile
      ? profile.parse(JSON.parse(r.profile))
      : {};
    const approvalStatus =
      managed.approvalStatus ??
      (managed.referenceAssetId ? "approved" : "pending");
    return {
      ...c,
      ...managed,
      demoCreditPrice: managed.demoCreditPrice ?? defaultCharacterCredits,
      approvalStatus,
      ...(managed.referenceAssetId && approvalStatus === "approved"
        ? {
            referenceImage: `/api/characters/reference?id=${encodeURIComponent(c.id)}`,
            image: `/api/characters/reference?id=${encodeURIComponent(c.id)}`,
          }
        : {}),
      enabled: r ? !!r.enabled : true,
      featured: r ? !!r.featured : c.badge === "FEATURED",
      price: r ? r.price : c.price,
      badge: r?.featured
        ? "FEATURED"
        : approvalStatus === "approved"
          ? "AVAILABLE"
          : c.badge,
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
    const wallet = activeWallet(this.roles);
    const limit = 25,
      offset = page * limit;
    const match = "%" + search.replace(/[\\%_]/g, "\\$&") + "%";
    const list = async (sql: string, values: unknown[] = []) =>
      (
        await this.db
          .prepare(sql)
          .bind(...values)
          .all<Record<string, unknown>>()
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
            `SELECT (SELECT COUNT(*) FROM users) users, (SELECT COUNT(*) FROM users WHERE suspended=1) suspended, (SELECT COALESCE(SUM(amount),0) FROM credit_transactions WHERE wallet='${wallet}') credits, (SELECT COUNT(*) FROM generations) generations, (SELECT COUNT(*) FROM generations WHERE status='failed') failed, (SELECT COUNT(*) FROM training_requests WHERE status NOT IN ('draft','completed','rejected')) training, (SELECT COUNT(*) FROM reports WHERE status='open') reports, (SELECT COUNT(*) FROM creator_listings WHERE status='pending_review') submissions`,
          )
          .first();
        return { metrics };
      }
      case "users":
        return {
          ...(await paged(
            `SELECT u.id,u.name,u.email,u.suspended,u.created_at,COALESCE((SELECT SUM(amount) FROM credit_transactions WHERE user_id=u.id AND wallet='${wallet}'),0) balance, (SELECT COUNT(*) FROM generations WHERE user_id=u.id) generations FROM users u WHERE (u.name LIKE ? ESCAPE '\\' OR u.email LIKE ? ESCAPE '\\' OR u.id LIKE ? ESCAPE '\\') ORDER BY u.created_at DESC,u.id`,
            [match, match, match],
          )),
          roles: this.rolesSummary(),
          characters: await catalogFor(this.db),
          permissions: await list("SELECT * FROM character_permissions"),
        };
      case "credits":
        return paged(
          `SELECT t.*,u.email FROM credit_transactions t JOIN users u ON u.id=t.user_id WHERE t.wallet='${wallet}' AND (u.email LIKE ? ESCAPE '\\' OR t.user_id LIKE ? ESCAPE '\\') ORDER BY t.created_at DESC,t.id`,
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
          orders: await list(
            "SELECT o.*,u.email FROM character_orders o JOIN users u ON u.id=o.user_id WHERE u.email LIKE ? ESCAPE '\\' ORDER BY o.created_at DESC,o.id LIMIT 100",
            [match],
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
        return {
          rows: (await catalogFor(this.db)).map((character) => ({
            ...character,
            referencePreview: character.referenceAssetId
              ? `/api/characters/reference?id=${encodeURIComponent(character.id)}&asset=${encodeURIComponent(character.referenceAssetId)}`
              : undefined,
          })),
          qualityExamples: await list(
            "SELECT g.id,g.character_id,g.model_id,g.type,p.character_reference FROM generations g JOIN provider_requests p ON p.generation_id=g.id WHERE g.user_id=? AND g.status='completed' AND p.state='completed' ORDER BY g.created_at DESC LIMIT 100",
            [this.actor],
          ),
        };
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
    const wallet = activeWallet(this.roles);
    const schema = schemas[action as keyof typeof schemas];
    if (!schema) throw new AdminError(400, "Unknown administration action.");
    const parsed = schema.safeParse(input);
    if (!parsed.success)
      throw new AdminError(400, parsed.error.issues[0].message);
    const d = parsed.data;
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
        .first();
      if (!row)
        throw new AdminError(404, "Record not found. Refresh the dashboard.");
      return row;
    };
    switch (action) {
      case "tester": {
        const d = schemas.tester.parse(input);
        await this.db.batch([
          this.db
            .prepare(
              "INSERT INTO demo_testers(email,enabled,approved_by,reason,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(email) DO UPDATE SET enabled=excluded.enabled,approved_by=excluded.approved_by,reason=excluded.reason,updated_at=excluded.updated_at",
            )
            .bind(
              d.id.toLowerCase(),
              +d.enabled,
              this.actor,
              d.reason,
              new Date().toISOString(),
            ),
          audit(),
        ]);
        break;
      }
      case "user": {
        const d = schemas.user.parse(input);
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
        const d = schemas.credits.parse(input);
        await find("users");
        const key =
          wallet === "demo"
            ? `admin-demo:${this.actor}:${d.key}`
            : `admin:${this.actor}:${d.key}`;
        const replay = async () => {
          const prior = await this.db
            .prepare(
              "SELECT user_id,amount,description FROM credit_transactions WHERE idempotency_key=?",
            )
            .bind(key)
            .first<{ user_id: string; amount: number; description: string }>();
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
                `INSERT INTO credit_transactions(id,user_id,amount,type,description,balance_before,balance_after,idempotency_key,wallet) SELECT ?,?,?,'admin_adjustment',?,COALESCE(SUM(amount),0),COALESCE(SUM(amount),0)+?,?,? FROM credit_transactions WHERE user_id=? AND wallet=?`,
              )
              .bind(
                crypto.randomUUID(),
                d.id,
                d.amount,
                d.reason,
                d.amount,
                key,
                wallet,
                d.id,
                wallet,
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
      case "model": {
        const d = schemas.model.parse(input);
        await find("ai_models");
        await this.db.batch([
          this.db
            .prepare("UPDATE ai_models SET credits=?,enabled=? WHERE id=?")
            .bind(d.credits, +d.enabled, d.id),
          audit(),
        ]);
        break;
      }
      case "package": {
        const d = schemas.package.parse(input);
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
      }
      case "character_permission": {
        const d = schemas.character_permission.parse(input);
        await find("users");
        if (
          d.characterId !== "*" &&
          !characters.some((c) => c.id === d.characterId)
        )
          throw new AdminError(404, "Character not found.");
        if (!d.canView && d.canGenerate)
          throw new AdminError(
            400,
            "Viewing must be allowed before generation.",
          );
        await this.db.batch([
          this.db
            .prepare(
              "INSERT INTO character_permissions(user_id,character_id,can_view,can_generate) VALUES(?,?,?,?) ON CONFLICT(user_id,character_id) DO UPDATE SET can_view=excluded.can_view,can_generate=excluded.can_generate",
            )
            .bind(d.id, d.characterId, +d.canView, +d.canGenerate),
          audit(),
        ]);
        break;
      }
      case "character": {
        const d = schemas.character.parse(input);
        if (
          d.profile?.approvalStatus === "approved" &&
          !d.profile.referenceAssetId
        )
          throw new AdminError(
            400,
            "Upload a reference portrait before approving this character.",
          );
        if (d.profile?.referenceAssetId) {
          const existing = (await catalogFor(this.db)).find(
            (c) => c.id === d.id,
          );
          if (existing?.referenceAssetId !== d.profile.referenceAssetId) {
            const asset = await this.db
              .prepare(
                "SELECT id FROM generation_assets WHERE id=? AND user_id=? AND generation_id IS NULL AND mime IN ('image/png','image/jpeg','image/webp')",
              )
              .bind(d.profile.referenceAssetId, this.actor)
              .first();
            if (!asset)
              throw new AdminError(
                400,
                "Upload an approved character portrait from your admin account first.",
              );
          }
        }
        if (!characters.some((c) => c.id === d.id))
          throw new AdminError(404, "Character not found.");
        if (d.profile && !d.fictionalAdultConfirmed)
          throw new AdminError(
            400,
            "Confirm this is a fictional adult character.",
          );
        const candidate = {
          ...characters.find((c) => c.id === d.id)!,
          ...d.profile,
        };
        const version = portraitVersionId(candidate);
        const existingVersion = version
          ? await readVersion(this.db, version)
          : null;
        const changes: D1PreparedStatement[] = candidate.referenceAssetId
          ? [draftVersionStatement(this.db, candidate)]
          : [];
        if (
          d.profile?.approvalStatus === "approved" &&
          (!existingVersion?.approved ||
            JSON.parse(existingVersion.reviewed_models).length === 0 ||
            d.reviewedGenerationIds.length)
        ) {
          try {
            const priorReviews = await this.db
              .prepare(
                "SELECT generation_id FROM character_quality_reviews WHERE version_id=?",
              )
              .bind(version)
              .all<{ generation_id: string }>();
            changes.push(
              ...(await qualityApprovalStatements(
                this.db,
                candidate,
                this.actor,
                d.reviewedGenerationIds.length
                  ? d.reviewedGenerationIds
                  : priorReviews.results.map((r) => r.generation_id),
                d.reason,
              )),
            );
          } catch (error) {
            throw new AdminError(409, (error as Error).message);
          }
        }

        if (d.profile?.approvalStatus === "rejected" && version)
          changes.push(
            this.db
              .prepare("UPDATE character_versions SET approved=0 WHERE id=?")
              .bind(version),
          );
        await this.db.batch([
          ...changes,
          this.db
            .prepare(
              "INSERT INTO character_controls(id,price,enabled,featured,profile) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET price=excluded.price,enabled=excluded.enabled,featured=excluded.featured,profile=COALESCE(excluded.profile,character_controls.profile)",
            )
            .bind(
              d.id,
              d.price,
              +d.enabled,
              +d.featured,
              d.profile ? JSON.stringify(d.profile) : null,
            ),
          audit(),
        ]);
        break;
      }
      case "listing": {
        const d = schemas.listing.parse(input);
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
      case "report": {
        const d = schemas.report.parse(input);
        await find("reports");
        await this.db.batch([
          this.db
            .prepare("UPDATE reports SET status=? WHERE id=?")
            .bind(d.status, d.id),
          audit(),
        ]);
        break;
      }
    }
    return { ok: true };
  }
}
