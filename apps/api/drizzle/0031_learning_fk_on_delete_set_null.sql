PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_skills` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`pinned` integer DEFAULT false NOT NULL,
	`agent_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_skills`("id", "name", "description", "pinned", "agent_id", "created_at", "updated_at") SELECT "id", "name", "description", "pinned", "agent_id", "created_at", "updated_at" FROM `skills`;--> statement-breakpoint
DROP TABLE `skills`;--> statement-breakpoint
ALTER TABLE `__new_skills` RENAME TO `skills`;--> statement-breakpoint
CREATE INDEX `skills_updated_at_idx` ON `skills` (`updated_at`);--> statement-breakpoint
CREATE TABLE `__new_rubrics` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`agent_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_rubrics`("id", "name", "description", "agent_id", "created_at", "updated_at") SELECT "id", "name", "description", "agent_id", "created_at", "updated_at" FROM `rubrics`;--> statement-breakpoint
DROP TABLE `rubrics`;--> statement-breakpoint
ALTER TABLE `__new_rubrics` RENAME TO `rubrics`;--> statement-breakpoint
CREATE INDEX `rubrics_updated_at_idx` ON `rubrics` (`updated_at`);--> statement-breakpoint
CREATE TABLE `__new_learning_suggestions` (
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
	FOREIGN KEY (`source_thread_id`) REFERENCES `threads`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_learning_suggestions`("id", "status", "suggestion_type", "title", "content", "confidence", "source_thread_id", "source_thread_title", "agent_id", "created_at", "updated_at") SELECT "id", "status", "suggestion_type", "title", "content", "confidence", "source_thread_id", "source_thread_title", "agent_id", "created_at", "updated_at" FROM `learning_suggestions`;--> statement-breakpoint
DROP TABLE `learning_suggestions`;--> statement-breakpoint
ALTER TABLE `__new_learning_suggestions` RENAME TO `learning_suggestions`;--> statement-breakpoint
CREATE INDEX `learning_suggestions_status_idx` ON `learning_suggestions` (`status`);--> statement-breakpoint
PRAGMA foreign_keys=ON;
