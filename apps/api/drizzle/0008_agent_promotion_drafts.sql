CREATE TABLE `agent_promotion_drafts` (
	`id` text PRIMARY KEY NOT NULL,
	`thread_id` text NOT NULL,
	`source_thread_title` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`system_prompt` text NOT NULL,
	`model` text NOT NULL,
	`tool_grants_json` text DEFAULT '[]' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`thread_id`) REFERENCES `threads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `agent_promotion_drafts_thread_id_idx` ON `agent_promotion_drafts` (`thread_id`);
--> statement-breakpoint
CREATE INDEX `agent_promotion_drafts_updated_at_idx` ON `agent_promotion_drafts` (`updated_at`);
