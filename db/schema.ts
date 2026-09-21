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

// Manual training is deliberately separate from paid content generation.
export const trainingRequests = sqliteTable(
  "training_requests",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    userEmail: text("user_email").notNull(),
    userName: text("user_name").notNull(),
    characterName: text("character_name").notNull(),
    characterDescription: text("character_description").notNull().default(""),
    characterType: text("character_type").notNull(),
    triggerWord: text("trigger_word").notNull().default(""),
    notes: text("notes").notNull().default(""),
    instructions: text("instructions").notNull().default(""),
    referencePrompt: text("reference_prompt").notNull().default(""),
    datasetPath: text("dataset_path").notNull(),
    imageCount: integer("image_count").notNull().default(0),
    datasetSize: integer("dataset_size").notNull().default(0),
    status: text("status").notNull().default("draft"),
    revision: integer("revision").notNull().default(0),
    eventId: text("event_id"),
    rejectionReason: text("rejection_reason"),
    provider: text("provider").notNull().default("manual"),
    submittedAt: text("submitted_at"),
    createdAt: time(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    index("training_user_date").on(t.userId, t.createdAt),
    index("training_status_date").on(t.status, t.createdAt),
    check(
      "training_status_valid",
      sql`${t.status} IN ('draft','pending','approved','training','quality_check','completed','rejected')`,
    ),
  ],
);
export const trainingFiles = sqliteTable(
  "training_files",
  {
    id: text("id").primaryKey(),
    requestId: text("request_id")
      .notNull()
      .references(() => trainingRequests.id),
    kind: text("kind").notNull(),
    name: text("name").notNull(),
    storageKey: text("storage_key").notNull().unique(),
    mime: text("mime").notNull(),
    size: integer("size").notNull(),
    ready: integer("ready").notNull().default(0),
    uploadId: text("upload_id"),
    createdAt: time(),
  },
  (t) => [
    index("training_files_request").on(t.requestId, t.kind),
    check(
      "training_file_kind",
      sql`${t.kind} IN ('dataset','weights','cover')`,
    ),
  ],
);
export const trainingParts = sqliteTable(
  "training_parts",
  {
    id: text("id").primaryKey(),
    fileId: text("file_id")
      .notNull()
      .references(() => trainingFiles.id, { onDelete: "cascade" }),
    partNumber: integer("part_number").notNull(),
    etag: text("etag").notNull(),
    size: integer("size").notNull(),
  },
  (t) => [uniqueIndex("training_part_unique").on(t.fileId, t.partNumber)],
);
export const trainedLoras = sqliteTable(
  "trained_loras",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    requestId: text("request_id")
      .notNull()
      .unique()
      .references(() => trainingRequests.id),
    name: text("name").notNull(),
    coverId: text("cover_id")
      .notNull()
      .references(() => trainingFiles.id),
    fileId: text("file_id")
      .notNull()
      .references(() => trainingFiles.id),
    triggerWord: text("trigger_word").notNull(),
    recommendedPrompt: text("recommended_prompt").notNull(),
    version: text("version").notNull(),
    description: text("description").notNull(),
    deletedAt: text("deleted_at"),
    createdAt: time(),
  },
  (t) => [index("lora_user_created").on(t.userId, t.createdAt)],
);
export const trainingEvents = sqliteTable(
  "training_events",
  {
    id: text("id").primaryKey(),
    requestId: text("request_id")
      .notNull()
      .references(() => trainingRequests.id),
    status: text("status").notNull(),
    message: text("message").notNull(),
    actorId: text("actor_id").notNull(),
    createdAt: time(),
  },
  (t) => [index("training_events_request").on(t.requestId, t.createdAt)],
);
export const trainingSettings = sqliteTable(
  "training_settings",
  {
    id: text("id").primaryKey(),
    maxImageMb: integer("max_image_mb").notNull().default(10),
  },
  (t) => [check("image_limit_valid", sql`${t.maxImageMb} BETWEEN 1 AND 25`)],
);
export const trainingEmails = sqliteTable(
  "training_emails",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => trainingEvents.id),
    recipient: text("recipient").notNull(),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    status: text("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    leaseUntil: integer("lease_until").notNull().default(0),
    firstAttemptAt: integer("first_attempt_at"),
    providerId: text("provider_id"),
    lastError: text("last_error"),
    createdAt: time(),
  },
  (t) => [
    uniqueIndex("training_email_event_recipient").on(t.eventId, t.recipient),
    index("training_email_pending").on(t.status, t.leaseUntil),
  ],
);
