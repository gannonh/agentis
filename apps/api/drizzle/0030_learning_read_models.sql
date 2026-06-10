CREATE TABLE `skills` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`pinned` integer DEFAULT false NOT NULL,
	`agent_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `skills_updated_at_idx` ON `skills` (`updated_at`);--> statement-breakpoint
CREATE TABLE `rubrics` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`agent_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `rubrics_updated_at_idx` ON `rubrics` (`updated_at`);--> statement-breakpoint
CREATE TABLE `learning_suggestions` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`suggestion_type` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`confidence` real,
	`source_thread_id` text,
	`source_thread_title` text,
	`agent_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`source_thread_id`) REFERENCES `threads`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `learning_suggestions_status_idx` ON `learning_suggestions` (`status`);
