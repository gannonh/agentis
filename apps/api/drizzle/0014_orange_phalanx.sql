CREATE TABLE `saved_memories` (
	`id` text PRIMARY KEY NOT NULL,
	`content` text NOT NULL,
	`category` text NOT NULL,
	`usage_guidance` text NOT NULL,
	`tags_json` text NOT NULL,
	`importance` text NOT NULL,
	`date` text NOT NULL,
	`scope` text NOT NULL,
	`associated_agent` text,
	`source` text NOT NULL,
	`provenance` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `saved_memories_category_idx` ON `saved_memories` (`category`);--> statement-breakpoint
CREATE TABLE `saved_memory_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`sort_order` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `saved_memory_categories_name_unique` ON `saved_memory_categories` (`name`);
