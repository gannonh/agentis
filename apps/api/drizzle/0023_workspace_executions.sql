CREATE TABLE `workspace_executions` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`thread_id` text NOT NULL,
	`run_id` text NOT NULL,
	`tool_call_id` text NOT NULL,
	`tool_name` text NOT NULL,
	`kind` text NOT NULL,
	`status` text NOT NULL,
	`approval_mode` text NOT NULL,
	`input_json` text NOT NULL,
	`result_json` text,
	`changed_files_json` text,
	`created_at` text NOT NULL,
	`finished_at` text,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`thread_id`) REFERENCES `threads`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`run_id`) REFERENCES `runs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `workspace_executions_run_id_idx` ON `workspace_executions` (`run_id`);
--> statement-breakpoint
CREATE INDEX `workspace_executions_thread_id_idx` ON `workspace_executions` (`thread_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `workspace_executions_run_tool_call_unique` ON `workspace_executions` (`run_id`,`tool_call_id`);
--> statement-breakpoint
CREATE TRIGGER `workspace_executions_consistency_insert`
BEFORE INSERT ON `workspace_executions`
BEGIN
	SELECT RAISE(ABORT, 'workspace_executions run/thread/workspace mismatch')
	WHERE NOT EXISTS (
		SELECT 1
		FROM `runs`
		INNER JOIN `threads` ON `threads`.`id` = `runs`.`thread_id`
		WHERE `runs`.`id` = NEW.`run_id`
			AND `runs`.`thread_id` = NEW.`thread_id`
			AND `threads`.`workspace_id` = NEW.`workspace_id`
	);
END;
--> statement-breakpoint
CREATE TRIGGER `workspace_executions_consistency_update`
BEFORE UPDATE OF `run_id`, `thread_id`, `workspace_id` ON `workspace_executions`
BEGIN
	SELECT RAISE(ABORT, 'workspace_executions run/thread/workspace mismatch')
	WHERE NOT EXISTS (
		SELECT 1
		FROM `runs`
		INNER JOIN `threads` ON `threads`.`id` = `runs`.`thread_id`
		WHERE `runs`.`id` = NEW.`run_id`
			AND `runs`.`thread_id` = NEW.`thread_id`
			AND `threads`.`workspace_id` = NEW.`workspace_id`
	);
END;
