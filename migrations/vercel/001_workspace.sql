CREATE SCHEMA IF NOT EXISTS model_drops;
REVOKE ALL ON SCHEMA model_drops FROM PUBLIC;
SET search_path TO model_drops;
CREATE TABLE "generation_assets" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"generation_id" text,
	"storage_key" text NOT NULL,
	"mime" text NOT NULL,
	"size" bigint NOT NULL,
	"created_at" text DEFAULT (to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) NOT NULL
);

CREATE INDEX "assets_user" ON "generation_assets" ("user_id");
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_id" text NOT NULL,
	"action" text NOT NULL,
	"entity_id" text NOT NULL,
	"metadata" text NOT NULL,
	"created_at" text DEFAULT (to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) NOT NULL
);

CREATE TABLE "favorites" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"character_id" text NOT NULL,
	"created_at" text DEFAULT (to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) NOT NULL
);

CREATE UNIQUE INDEX "favorite_user_character" ON "favorites" ("user_id","character_id");
CREATE TABLE "generations" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"character_id" text,
	"model_id" text NOT NULL,
	"prompt" text NOT NULL,
	"settings" text NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"cost" bigint NOT NULL,
	"asset_key" text,
	"project_id" text,
	"reference_id" text,
	"idempotency_key" text NOT NULL,
	"error" text,
	"created_at" text DEFAULT (to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) NOT NULL,
	"updated_at" text NOT NULL
);

CREATE UNIQUE INDEX "generations_idempotency_key_unique" ON "generations" ("idempotency_key");
CREATE INDEX "generations_user_created" ON "generations" ("user_id","created_at");
CREATE TABLE "generation_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"generation_id" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"attempts" bigint DEFAULT 0 NOT NULL,
	"lease_until" text,
	"created_at" text DEFAULT (to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) NOT NULL
);

CREATE UNIQUE INDEX "generation_jobs_generation_id_unique" ON "generation_jobs" ("generation_id");
CREATE INDEX "jobs_status_lease" ON "generation_jobs" ("status","lease_until");
CREATE TABLE "credit_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"amount" bigint NOT NULL,
	"type" text NOT NULL,
	"generation_id" text,
	"description" text NOT NULL,
	"balance_before" bigint NOT NULL,
	"balance_after" bigint NOT NULL,
	"idempotency_key" text NOT NULL,
	"created_at" text DEFAULT (to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) NOT NULL,
	CONSTRAINT "balance_nonnegative" CHECK("credit_transactions"."balance_after" >= 0),
	CONSTRAINT "balance_arithmetic" CHECK("credit_transactions"."balance_before"+"credit_transactions"."amount"="credit_transactions"."balance_after")
);

CREATE UNIQUE INDEX "credit_transactions_idempotency_key_unique" ON "credit_transactions" ("idempotency_key");
CREATE INDEX "ledger_user_created" ON "credit_transactions" ("user_id","created_at");
CREATE TABLE "creator_listings" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"rights_confirmed" bigint NOT NULL,
	"status" text DEFAULT 'pending_review' NOT NULL,
	"created_at" text DEFAULT (to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) NOT NULL
);

CREATE INDEX "listings_user" ON "creator_listings" ("user_id");
CREATE TABLE "ai_models" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"provider" text NOT NULL,
	"type" text NOT NULL,
	"credits" bigint NOT NULL,
	"enabled" bigint DEFAULT 1 NOT NULL,
	"config" text NOT NULL,
	"created_at" text DEFAULT (to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) NOT NULL,
	CONSTRAINT "model_credits_positive" CHECK("ai_models"."credits">0)
);

CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"message" text NOT NULL,
	"read" bigint DEFAULT 0 NOT NULL,
	"created_at" text DEFAULT (to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) NOT NULL
);

CREATE INDEX "notifications_user_created" ON "notifications" ("user_id","created_at");
CREATE TABLE "credit_packages" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"price" bigint NOT NULL,
	"credits" bigint NOT NULL,
	"enabled" bigint DEFAULT 1 NOT NULL,
	"created_at" text DEFAULT (to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) NOT NULL
);

CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_at" text DEFAULT (to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) NOT NULL
);

CREATE INDEX "projects_user" ON "projects" ("user_id");
CREATE TABLE "character_purchases" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"character_id" text NOT NULL,
	"license_snapshot" text NOT NULL,
	"license_version" text NOT NULL,
	"price_cents" bigint NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" text DEFAULT (to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) NOT NULL
);

CREATE UNIQUE INDEX "purchase_user_character" ON "character_purchases" ("user_id","character_id");
CREATE TABLE "reports" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"character_id" text NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" text DEFAULT (to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) NOT NULL
);

CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"default_private" bigint DEFAULT 1 NOT NULL,
	"created_at" text DEFAULT (to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) NOT NULL
);

CREATE TABLE "trained_loras" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"request_id" text NOT NULL,
	"name" text NOT NULL,
	"cover_id" text NOT NULL,
	"file_id" text NOT NULL,
	"trigger_word" text NOT NULL,
	"recommended_prompt" text NOT NULL,
	"version" text NOT NULL,
	"description" text NOT NULL,
	"deleted_at" text,
	"created_at" text DEFAULT (to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) NOT NULL
);

CREATE UNIQUE INDEX "trained_loras_request_id_unique" ON "trained_loras" ("request_id");
CREATE INDEX "lora_user_created" ON "trained_loras" ("user_id","created_at");
CREATE TABLE "training_emails" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"recipient" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" bigint DEFAULT 0 NOT NULL,
	"lease_until" bigint DEFAULT 0 NOT NULL,
	"first_attempt_at" bigint,
	"provider_id" text,
	"last_error" text,
	"created_at" text DEFAULT (to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) NOT NULL
);

CREATE UNIQUE INDEX "training_email_event_recipient" ON "training_emails" ("event_id","recipient");
CREATE INDEX "training_email_pending" ON "training_emails" ("status","lease_until");
CREATE TABLE "training_events" (
	"id" text PRIMARY KEY NOT NULL,
	"request_id" text NOT NULL,
	"status" text NOT NULL,
	"message" text NOT NULL,
	"actor_id" text NOT NULL,
	"created_at" text DEFAULT (to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) NOT NULL
);

CREATE INDEX "training_events_request" ON "training_events" ("request_id","created_at");
CREATE TABLE "training_files" (
	"id" text PRIMARY KEY NOT NULL,
	"request_id" text NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"storage_key" text NOT NULL,
	"mime" text NOT NULL,
	"size" bigint NOT NULL,
	"ready" bigint DEFAULT 0 NOT NULL,
	"upload_id" text,
	"created_at" text DEFAULT (to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) NOT NULL,
	CONSTRAINT "training_file_kind" CHECK("training_files"."kind" IN ('dataset','weights','cover'))
);

CREATE UNIQUE INDEX "training_files_storage_key_unique" ON "training_files" ("storage_key");
CREATE INDEX "training_files_request" ON "training_files" ("request_id","kind");
CREATE TABLE "training_parts" (
	"id" text PRIMARY KEY NOT NULL,
	"file_id" text NOT NULL,
	"part_number" bigint NOT NULL,
	"etag" text NOT NULL,
	"size" bigint NOT NULL
);

CREATE UNIQUE INDEX "training_part_unique" ON "training_parts" ("file_id","part_number");
CREATE TABLE "training_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"user_email" text NOT NULL,
	"user_name" text NOT NULL,
	"character_name" text NOT NULL,
	"character_description" text DEFAULT '' NOT NULL,
	"character_type" text NOT NULL,
	"trigger_word" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"instructions" text DEFAULT '' NOT NULL,
	"reference_prompt" text DEFAULT '' NOT NULL,
	"dataset_path" text NOT NULL,
	"image_count" bigint DEFAULT 0 NOT NULL,
	"dataset_size" bigint DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"revision" bigint DEFAULT 0 NOT NULL,
	"event_id" text,
	"rejection_reason" text,
	"provider" text DEFAULT 'manual' NOT NULL,
	"submitted_at" text,
	"created_at" text DEFAULT (to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "training_status_valid" CHECK("training_requests"."status" IN ('draft','pending','approved','training','quality_check','completed','rejected'))
);

CREATE INDEX "training_user_date" ON "training_requests" ("user_id","created_at");
CREATE INDEX "training_status_date" ON "training_requests" ("status","created_at");
CREATE TABLE "training_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"max_image_mb" bigint DEFAULT 10 NOT NULL,
	CONSTRAINT "image_limit_valid" CHECK("training_settings"."max_image_mb" BETWEEN 1 AND 25)
);

CREATE TABLE "character_controls" (
	"id" text PRIMARY KEY NOT NULL,
	"enabled" bigint DEFAULT 1 NOT NULL,
	"featured" bigint DEFAULT 0 NOT NULL,
	"price" bigint DEFAULT 0 NOT NULL
);

ALTER TABLE "users" ADD "suspended" bigint DEFAULT 0 NOT NULL;





ALTER TABLE "generation_assets" ADD FOREIGN KEY ("user_id") REFERENCES "users"("id") ON UPDATE no action ON DELETE no action;
ALTER TABLE "generation_assets" ADD FOREIGN KEY ("generation_id") REFERENCES "generations"("id") ON UPDATE no action ON DELETE no action;
ALTER TABLE "audit_logs" ADD FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON UPDATE no action ON DELETE no action;
ALTER TABLE "favorites" ADD FOREIGN KEY ("user_id") REFERENCES "users"("id") ON UPDATE no action ON DELETE no action;
ALTER TABLE "generations" ADD FOREIGN KEY ("user_id") REFERENCES "users"("id") ON UPDATE no action ON DELETE no action;
ALTER TABLE "generations" ADD FOREIGN KEY ("model_id") REFERENCES "ai_models"("id") ON UPDATE no action ON DELETE no action;
ALTER TABLE "generations" ADD FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON UPDATE no action ON DELETE no action;
ALTER TABLE "generation_jobs" ADD FOREIGN KEY ("generation_id") REFERENCES "generations"("id") ON UPDATE no action ON DELETE no action;
ALTER TABLE "credit_transactions" ADD FOREIGN KEY ("user_id") REFERENCES "users"("id") ON UPDATE no action ON DELETE no action;
ALTER TABLE "creator_listings" ADD FOREIGN KEY ("user_id") REFERENCES "users"("id") ON UPDATE no action ON DELETE no action;
ALTER TABLE "notifications" ADD FOREIGN KEY ("user_id") REFERENCES "users"("id") ON UPDATE no action ON DELETE no action;
ALTER TABLE "projects" ADD FOREIGN KEY ("user_id") REFERENCES "users"("id") ON UPDATE no action ON DELETE no action;
ALTER TABLE "character_purchases" ADD FOREIGN KEY ("user_id") REFERENCES "users"("id") ON UPDATE no action ON DELETE no action;
ALTER TABLE "reports" ADD FOREIGN KEY ("user_id") REFERENCES "users"("id") ON UPDATE no action ON DELETE no action;
ALTER TABLE "trained_loras" ADD FOREIGN KEY ("user_id") REFERENCES "users"("id") ON UPDATE no action ON DELETE no action;
ALTER TABLE "trained_loras" ADD FOREIGN KEY ("request_id") REFERENCES "training_requests"("id") ON UPDATE no action ON DELETE no action;
ALTER TABLE "trained_loras" ADD FOREIGN KEY ("cover_id") REFERENCES "training_files"("id") ON UPDATE no action ON DELETE no action;
ALTER TABLE "trained_loras" ADD FOREIGN KEY ("file_id") REFERENCES "training_files"("id") ON UPDATE no action ON DELETE no action;
ALTER TABLE "training_emails" ADD FOREIGN KEY ("event_id") REFERENCES "training_events"("id") ON UPDATE no action ON DELETE no action;
ALTER TABLE "training_events" ADD FOREIGN KEY ("request_id") REFERENCES "training_requests"("id") ON UPDATE no action ON DELETE no action;
ALTER TABLE "training_files" ADD FOREIGN KEY ("request_id") REFERENCES "training_requests"("id") ON UPDATE no action ON DELETE no action;
ALTER TABLE "training_parts" ADD FOREIGN KEY ("file_id") REFERENCES "training_files"("id") ON UPDATE no action ON DELETE cascade;
ALTER TABLE "training_requests" ADD FOREIGN KEY ("user_id") REFERENCES "users"("id") ON UPDATE no action ON DELETE no action;
CREATE FUNCTION immutable_record() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Record is append-only'; END $$;
CREATE TRIGGER ledger_append_only BEFORE UPDATE OR DELETE ON credit_transactions FOR EACH ROW EXECUTE FUNCTION immutable_record();
CREATE TRIGGER audit_append_only BEFORE UPDATE OR DELETE ON audit_logs FOR EACH ROW EXECUTE FUNCTION immutable_record();
CREATE TRIGGER purchase_snapshot_immutable BEFORE UPDATE OF license_snapshot,license_version,price_cents,user_id,character_id ON character_purchases FOR EACH ROW EXECUTE FUNCTION immutable_record();
CREATE FUNCTION ledger_balance_check() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM 1 FROM users WHERE id=NEW.user_id FOR UPDATE;
  IF NOT EXISTS(SELECT 1 FROM credit_transactions WHERE idempotency_key=NEW.idempotency_key)
     AND NEW.balance_before <> (SELECT COALESCE(SUM(amount),0) FROM credit_transactions WHERE user_id=NEW.user_id)
  THEN RAISE EXCEPTION 'Stale credit balance'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER ledger_balance_integrity BEFORE INSERT ON credit_transactions FOR EACH ROW EXECUTE FUNCTION ledger_balance_check();
CREATE TABLE upload_transfers (
 id text PRIMARY KEY, user_id text NOT NULL REFERENCES users(id),
 storage_key text NOT NULL UNIQUE, target text NOT NULL, size bigint NOT NULL CHECK(size BETWEEN 1 AND 26214400),
 expires_at bigint NOT NULL, claimed bigint NOT NULL DEFAULT 0
);
CREATE INDEX upload_transfers_owner ON upload_transfers(user_id,expires_at);
REVOKE ALL ON ALL TABLES IN SCHEMA model_drops FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA model_drops FROM PUBLIC;
