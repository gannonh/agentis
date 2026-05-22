CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`goals` text,
	`status` text NOT NULL,
	`archived_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `projects_status_idx` ON `projects` (`status`);--> statement-breakpoint
CREATE INDEX `projects_updated_at_idx` ON `projects` (`updated_at`);--> statement-breakpoint
CREATE TABLE `project_memories` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`content` text NOT NULL,
	`enabled` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `project_memories_project_id_idx` ON `project_memories` (`project_id`);--> statement-breakpoint
CREATE TABLE `artifacts` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`type` text NOT NULL,
	`mime_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`storage_key` text NOT NULL,
	`preview_text` text,
	`metadata_json` text,
	`project_id` text,
	`project_name_snapshot` text,
	`thread_id` text,
	`thread_title_snapshot` text,
	`run_id` text,
	`agent_id` text,
	`agent_name_snapshot` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`thread_id`) REFERENCES `threads`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`run_id`) REFERENCES `runs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `artifacts_type_idx` ON `artifacts` (`type`);--> statement-breakpoint
CREATE INDEX `artifacts_project_id_idx` ON `artifacts` (`project_id`);--> statement-breakpoint
CREATE INDEX `artifacts_thread_id_idx` ON `artifacts` (`thread_id`);--> statement-breakpoint
CREATE INDEX `artifacts_run_id_idx` ON `artifacts` (`run_id`);--> statement-breakpoint
CREATE INDEX `artifacts_created_at_idx` ON `artifacts` (`created_at`);
