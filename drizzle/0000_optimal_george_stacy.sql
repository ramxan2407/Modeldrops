CREATE TABLE `generation_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`generation_id` text,
	`storage_key` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`generation_id`) REFERENCES `generations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `assets_user` ON `generation_assets` (`user_id`);--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text NOT NULL,
	`action` text NOT NULL,
	`entity_id` text NOT NULL,
	`metadata` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `favorites` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`character_id` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `favorite_user_character` ON `favorites` (`user_id`,`character_id`);--> statement-breakpoint
CREATE TABLE `generations` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`character_id` text,
	`model_id` text NOT NULL,
	`prompt` text NOT NULL,
	`settings` text NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`cost` integer NOT NULL,
	`asset_key` text,
	`project_id` text,
	`reference_id` text,
	`idempotency_key` text NOT NULL,
	`error` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`model_id`) REFERENCES `ai_models`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `generations_idempotency_key_unique` ON `generations` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `generations_user_created` ON `generations` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `generation_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`generation_id` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`lease_until` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`generation_id`) REFERENCES `generations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `generation_jobs_generation_id_unique` ON `generation_jobs` (`generation_id`);--> statement-breakpoint
CREATE INDEX `jobs_status_lease` ON `generation_jobs` (`status`,`lease_until`);--> statement-breakpoint
CREATE TABLE `credit_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`amount` integer NOT NULL,
	`type` text NOT NULL,
	`generation_id` text,
	`description` text NOT NULL,
	`balance_before` integer NOT NULL,
	`balance_after` integer NOT NULL,
	`idempotency_key` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "balance_nonnegative" CHECK("credit_transactions"."balance_after" >= 0),
	CONSTRAINT "balance_arithmetic" CHECK("credit_transactions"."balance_before"+"credit_transactions"."amount"="credit_transactions"."balance_after")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `credit_transactions_idempotency_key_unique` ON `credit_transactions` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `ledger_user_created` ON `credit_transactions` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `creator_listings` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`rights_confirmed` integer NOT NULL,
	`status` text DEFAULT 'pending_review' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `listings_user` ON `creator_listings` (`user_id`);--> statement-breakpoint
CREATE TABLE `ai_models` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`provider` text NOT NULL,
	`type` text NOT NULL,
	`credits` integer NOT NULL,
	`enabled` integer DEFAULT 1 NOT NULL,
	`config` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	CONSTRAINT "model_credits_positive" CHECK("ai_models"."credits">0)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`message` text NOT NULL,
	`read` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `notifications_user_created` ON `notifications` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `credit_packages` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`price` integer NOT NULL,
	`credits` integer NOT NULL,
	`enabled` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `projects_user` ON `projects` (`user_id`);--> statement-breakpoint
CREATE TABLE `character_purchases` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`character_id` text NOT NULL,
	`license_snapshot` text NOT NULL,
	`license_version` text NOT NULL,
	`price_cents` integer NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `purchase_user_character` ON `character_purchases` (`user_id`,`character_id`);--> statement-breakpoint
CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`character_id` text NOT NULL,
	`reason` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`role` text DEFAULT 'user' NOT NULL,
	`default_private` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
