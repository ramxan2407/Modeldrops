CREATE TABLE `character_controls` (
	`id` text PRIMARY KEY NOT NULL,
	`enabled` integer DEFAULT 1 NOT NULL,
	`featured` integer DEFAULT 0 NOT NULL,
	`price` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE `users` ADD `suspended` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE TRIGGER audit_append_only_update BEFORE UPDATE ON audit_logs BEGIN SELECT RAISE(ABORT, 'Audit log is append-only'); END;
--> statement-breakpoint
CREATE TRIGGER audit_append_only_delete BEFORE DELETE ON audit_logs BEGIN SELECT RAISE(ABORT, 'Audit log is append-only'); END;
