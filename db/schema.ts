import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
const time = () =>
  text("created_at")
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`);
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull().default("user"),
  defaultPrivate: integer("default_private").notNull().default(1),
  createdAt: time(),
});
export const ledger = sqliteTable(
  "credit_transactions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    amount: integer("amount").notNull(),
    type: text("type").notNull(),
    generationId: text("generation_id"),
    description: text("description").notNull(),
    balanceBefore: integer("balance_before").notNull(),
    balanceAfter: integer("balance_after").notNull(),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    createdAt: time(),
  },
  (t) => [
    index("ledger_user_created").on(t.userId, t.createdAt),
    check("balance_nonnegative", sql`${t.balanceAfter} >= 0`),
    check(
      "balance_arithmetic",
      sql`${t.balanceBefore}+${t.amount}=${t.balanceAfter}`,
    ),
  ],
);
export const purchases = sqliteTable(
  "character_purchases",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    characterId: text("character_id").notNull(),
    licenseSnapshot: text("license_snapshot").notNull(),
    licenseVersion: text("license_version").notNull(),
    priceCents: integer("price_cents").notNull(),
    status: text("status").notNull().default("active"),
    createdAt: time(),
  },
  (t) => [uniqueIndex("purchase_user_character").on(t.userId, t.characterId)],
);
export const favorites = sqliteTable(
  "favorites",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    characterId: text("character_id").notNull(),
    createdAt: time(),
  },
  (t) => [uniqueIndex("favorite_user_character").on(t.userId, t.characterId)],
);
export const projects = sqliteTable(
  "projects",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    createdAt: time(),
  },
  (t) => [index("projects_user").on(t.userId)],
);
export const models = sqliteTable(
  "ai_models",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    provider: text("provider").notNull(),
    type: text("type").notNull(),
    credits: integer("credits").notNull(),
    enabled: integer("enabled").notNull().default(1),
    config: text("config").notNull(),
    createdAt: time(),
  },
  (t) => [check("model_credits_positive", sql`${t.credits}>0`)],
);
export const packages = sqliteTable("credit_packages", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  price: integer("price").notNull(),
  credits: integer("credits").notNull(),
  enabled: integer("enabled").notNull().default(1),
  createdAt: time(),
});
export const generations = sqliteTable(
  "generations",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    characterId: text("character_id"),
    modelId: text("model_id")
      .notNull()
      .references(() => models.id),
    prompt: text("prompt").notNull(),
    settings: text("settings").notNull(),
    type: text("type").notNull(),
    status: text("status").notNull().default("queued"),
    cost: integer("cost").notNull(),
    assetKey: text("asset_key"),
    projectId: text("project_id").references(() => projects.id),
    referenceId: text("reference_id"),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    error: text("error"),
    createdAt: time(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("generations_user_created").on(t.userId, t.createdAt)],
);
export const jobs = sqliteTable(
  "generation_jobs",
  {
    id: text("id").primaryKey(),
    generationId: text("generation_id")
      .notNull()
      .unique()
      .references(() => generations.id),
    status: text("status").notNull().default("queued"),
    attempts: integer("attempts").notNull().default(0),
    leaseUntil: text("lease_until"),
    createdAt: time(),
  },
  (t) => [index("jobs_status_lease").on(t.status, t.leaseUntil)],
);
export const assets = sqliteTable(
  "generation_assets",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    generationId: text("generation_id").references(() => generations.id),
    storageKey: text("storage_key").notNull(),
    mime: text("mime").notNull(),
    size: integer("size").notNull(),
    createdAt: time(),
  },
  (t) => [index("assets_user").on(t.userId)],
);
export const notifications = sqliteTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    message: text("message").notNull(),
    read: integer("read").notNull().default(0),
    createdAt: time(),
  },
  (t) => [index("notifications_user_created").on(t.userId, t.createdAt)],
);
export const listings = sqliteTable(
  "creator_listings",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    name: text("name").notNull(),
    description: text("description").notNull(),
    rightsConfirmed: integer("rights_confirmed").notNull(),
    status: text("status").notNull().default("pending_review"),
    createdAt: time(),
  },
  (t) => [index("listings_user").on(t.userId)],
);
export const reports = sqliteTable("reports", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  characterId: text("character_id").notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("open"),
  createdAt: time(),
});
export const audit = sqliteTable("audit_logs", {
  id: text("id").primaryKey(),
  actorId: text("actor_id")
    .notNull()
    .references(() => users.id),
  action: text("action").notNull(),
  entityId: text("entity_id").notNull(),
  metadata: text("metadata").notNull(),
  createdAt: time(),
});
