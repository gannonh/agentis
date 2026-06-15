CREATE TABLE `agent_schedules` (
	`id` text PRIMARY KEY NOT NULL,
	`agent_id` text NOT NULL,
	`name` text NOT NULL,
	`status` text NOT NULL,
	`cadence` text NOT NULL,
	`cron_expression` text,
	`timezone` text NOT NULL,
	`prompt_template` text NOT NULL,
	`project_id` text,
	`cadence_config_json` text NOT NULL,
	`next_run_at` text,
	`last_run_at` text,
	`last_run_status` text,
	`last_failure_reason` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `agent_schedules_agent_id_idx` ON `agent_schedules` (`agent_id`);--> statement-breakpoint
CREATE INDEX `agent_schedules_status_next_run_at_idx` ON `agent_schedules` (`status`, `next_run_at`);--> statement-breakpoint
CREATE TABLE `agent_invocation_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`source_type` text NOT NULL,
	`source_id` text NOT NULL,
	`due_at` text NOT NULL,
	`status` text NOT NULL,
	`thread_id` text,
	`run_id` text,
	`failure_reason` text,
	`claimed_at` text,
	`started_at` text,
	`finished_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`thread_id`) REFERENCES `threads`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`run_id`) REFERENCES `runs`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `agent_invocation_runs_source_idx` ON `agent_invocation_runs` (`source_type`, `source_id`);--> statement-breakpoint
CREATE INDEX `agent_invocation_runs_status_claimed_at_idx` ON `agent_invocation_runs` (`status`, `claimed_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `agent_invocation_runs_source_due_unique` ON `agent_invocation_runs` (`source_type`, `source_id`, `due_at`);
