import { env } from "cloudflare:workers";
import { getAppUser } from "@/lib/app-auth";
import { roleFor, sameOrigin } from "./admin/policy";
import {
  generationModels,
  generationConfigured,
  type GenerationEnvironment,
} from "./generation/models";
import { models, packages } from "@/lib/catalog";
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const uid = () => crypto.randomUUID();
export function bindings() {
  const e = env as unknown as GenerationEnvironment & {
    DB: D1Database;
    DEMO_ASSET?: () => Promise<ArrayBuffer>;
    BUCKET: R2Bucket;
    ADMIN_USER_IDS?: string;
    SUPER_ADMIN_USER_IDS?: string;
    JOB_RUNNER_SECRET?: string;
    CRON_SECRET?: string;
    WELCOME_CREDITS?: string;
    RESEND_API_KEY?: string;
    LORA_EMAIL_FROM?: string;
    LORA_ADMIN_EMAILS?: string;
    APP_ORIGIN?: string;
    MAX_LORA_UPLOAD_BYTES?: string;
  };
  if (!e.DB) throw new ApiError(503, "Workspace storage is not configured.");
  return e;
}
export async function auth() {
  const user = await getAppUser();
  if (!user) throw new ApiError(401, "Sign in to use your workspace.");
  const state = await bindings()
    .DB.prepare("SELECT suspended FROM users WHERE id=?")
    .bind(user.userId)
    .first<{ suspended: number }>();
  if (state?.suspended)
    throw new ApiError(
      403,
      "Your account is suspended. Contact Model Drops support.",
    );
  return user;
}
export async function initialize(user: Awaited<ReturnType<typeof auth>>) {
  const { DB, WELCOME_CREDITS } = bindings();
  const welcomeCredits = Number(
    WELCOME_CREDITS ?? (generationConfigured(bindings()) ? "0" : "1840"),
  );
  if (
    !Number.isSafeInteger(welcomeCredits) ||
    welcomeCredits < 0 ||
    welcomeCredits > 10000
  )
    throw new ApiError(
      503,
      "Account credit configuration requires administrator review.",
    );
  const known = await DB.prepare("SELECT id FROM ai_models").all<{
    id: string;
  }>();
  const knownIds = new Set(known.results.map((m) => m.id));
  const statements = [
    DB.prepare("INSERT OR IGNORE INTO users(id,name,email) VALUES(?,?,?)").bind(
      user.userId,
      user.fullName || "Creator",
      user.email,
    ),
    ...[
      ...models,
      ...(generationConfigured(bindings()) ? generationModels : []),
    ]
      .filter((m) => !knownIds.has(m.id))
      .map((m) =>
        DB.prepare(
          "INSERT OR IGNORE INTO ai_models(id,name,provider,type,credits,enabled,config) VALUES(?,?,?,?,?,?,?)",
        ).bind(
          m.id,
          m.name,
          m.provider,
          m.type,
          m.credits,
          1,
          JSON.stringify(m),
        ),
      ),
    ...packages.map((p) =>
      DB.prepare(
        "INSERT OR IGNORE INTO credit_packages(id,name,price,credits) VALUES(?,?,?,?)",
      ).bind(p.id, p.name, p.price, p.credits),
    ),
    DB.prepare(
      "INSERT OR IGNORE INTO credit_transactions(id,user_id,amount,type,description,balance_before,balance_after,idempotency_key) VALUES(?,?,?,'promotion',?,0,?,?)",
    ).bind(
      uid(),
      user.userId,
      welcomeCredits,
      generationConfigured(bindings())
        ? "Welcome to Model Drops"
        : "Welcome to Model Drops · demo credits",
      welcomeCredits,
      `welcome:${user.userId}`,
    ),
  ];
  await DB.batch(statements);
}
export const isSuperAdmin = (id: string) =>
  roleFor(bindings(), id) === "super_admin";
export const isAdmin = (id: string) => roleFor(bindings(), id) !== "user";
export function requireSuperAdmin(id: string) {
  if (!isSuperAdmin(id))
    throw new ApiError(403, "Super administrator access required.");
}
export function requireAdmin(id: string) {
  if (!isAdmin(id)) throw new ApiError(403, "Administrator access required.");
}
export function assertOrigin(request: Request) {
  if (!sameOrigin(request))
    throw new ApiError(403, "Cross-origin request rejected.");
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new ApiError(415, "JSON is required.");
}
export function fail(e: unknown) {
  if (e instanceof ApiError)
    return Response.json({ error: e.message }, { status: e.status });
  console.error(
    "Platform request failed",
    e instanceof Error ? e.message : "unknown",
  );
  return Response.json(
    { error: "The operation could not be completed. Please try again." },
    { status: 500 },
  );
}
export function ledgerStatement(
  userId: string,
  amount: number,
  type: string,
  description: string,
  key: string,
  generationId: string | null = null,
) {
  return bindings()
    .DB.prepare(
      `INSERT OR IGNORE INTO credit_transactions(id,user_id,amount,type,generation_id,description,balance_before,balance_after,idempotency_key) SELECT ?,?,?,?,?,?,COALESCE(SUM(amount),0),COALESCE(SUM(amount),0)+?,? FROM credit_transactions WHERE user_id=?`,
    )
    .bind(
      uid(),
      userId,
      amount,
      type,
      generationId,
      description,
      amount,
      key,
      userId,
    );
}
