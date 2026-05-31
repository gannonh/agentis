CREATE TABLE `workspace_edits` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`thread_id` text NOT NULL,
	`run_id` text NOT NULL,
	`tool_call_id` text NOT NULL,
	`tool_name` text NOT NULL,
	`operation` text NOT NULL,
	`path` text NOT NULL,
	`status` text NOT NULL,
	`approval_mode` text NOT NULL,
	`input_json` text NOT NULL,
	`result_json` text,
	`content_hash_before` text,
	`content_hash_after` text,
	`created_at` text NOT NULL,
	`applied_at` text,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`thread_id`) REFERENCES `threads`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`run_id`) REFERENCES `runs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `workspace_edits_run_id_idx` ON `workspace_edits` (`run_id`);
--> statement-breakpoint
CREATE INDEX `workspace_edits_thread_id_idx` ON `workspace_edits` (`thread_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `workspace_edits_run_tool_call_unique` ON `workspace_edits` (`run_id`,`tool_call_id`);
