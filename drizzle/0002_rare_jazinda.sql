CREATE TABLE `trained_loras` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`request_id` text NOT NULL,
	`name` text NOT NULL,
	`cover_id` text NOT NULL,
	`file_id` text NOT NULL,
	`trigger_word` text NOT NULL,
	`recommended_prompt` text NOT NULL,
	`version` text NOT NULL,
	`description` text NOT NULL,
	`deleted_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`request_id`) REFERENCES `training_requests`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`cover_id`) REFERENCES `training_files`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`file_id`) REFERENCES `training_files`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `trained_loras_request_id_unique` ON `trained_loras` (`request_id`);--> statement-breakpoint
CREATE INDEX `lora_user_created` ON `trained_loras` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `training_emails` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`recipient` text NOT NULL,
	`subject` text NOT NULL,
	`body` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`lease_until` integer DEFAULT 0 NOT NULL,
	`first_attempt_at` integer,
	`provider_id` text,
	`last_error` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `training_events`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `training_email_event_recipient` ON `training_emails` (`event_id`,`recipient`);--> statement-breakpoint
CREATE INDEX `training_email_pending` ON `training_emails` (`status`,`lease_until`);--> statement-breakpoint
CREATE TABLE `training_events` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`status` text NOT NULL,
	`message` text NOT NULL,
	`actor_id` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`request_id`) REFERENCES `training_requests`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `training_events_request` ON `training_events` (`request_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `training_files` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`storage_key` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`ready` integer DEFAULT 0 NOT NULL,
	`upload_id` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`request_id`) REFERENCES `training_requests`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "training_file_kind" CHECK("training_files"."kind" IN ('dataset','weights','cover'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `training_files_storage_key_unique` ON `training_files` (`storage_key`);--> statement-breakpoint
CREATE INDEX `training_files_request` ON `training_files` (`request_id`,`kind`);--> statement-breakpoint
CREATE TABLE `training_parts` (
	`id` text PRIMARY KEY NOT NULL,
	`file_id` text NOT NULL,
	`part_number` integer NOT NULL,
	`etag` text NOT NULL,
	`size` integer NOT NULL,
	FOREIGN KEY (`file_id`) REFERENCES `training_files`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `training_part_unique` ON `training_parts` (`file_id`,`part_number`);--> statement-breakpoint
CREATE TABLE `training_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`user_email` text NOT NULL,
	`user_name` text NOT NULL,
	`character_name` text NOT NULL,
	`character_description` text DEFAULT '' NOT NULL,
	`character_type` text NOT NULL,
	`trigger_word` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`instructions` text DEFAULT '' NOT NULL,
	`reference_prompt` text DEFAULT '' NOT NULL,
	`dataset_path` text NOT NULL,
	`image_count` integer DEFAULT 0 NOT NULL,
	`dataset_size` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`event_id` text,
	`rejection_reason` text,
	`provider` text DEFAULT 'manual' NOT NULL,
	`submitted_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "training_status_valid" CHECK("training_requests"."status" IN ('draft','pending','approved','training','quality_check','completed','rejected'))
);
--> statement-breakpoint
CREATE INDEX `training_user_date` ON `training_requests` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `training_status_date` ON `training_requests` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `training_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`max_image_mb` integer DEFAULT 10 NOT NULL,
	CONSTRAINT "image_limit_valid" CHECK("training_settings"."max_image_mb" BETWEEN 1 AND 25)
);
