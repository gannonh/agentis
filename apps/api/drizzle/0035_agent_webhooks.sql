CREATE TABLE `agent_webhooks` (
	`id` text PRIMARY KEY NOT NULL,
	`agent_id` text NOT NULL,
	`name` text NOT NULL,
	`status` text NOT NULL,
	`secret_ciphertext` text NOT NULL,
	`secret_prefix` text NOT NULL,
	`prompt_template` text NOT NULL,
	`project_id` text,
	`last_delivery_at` text,
	`last_delivery_status` text,
	`last_failure_reason` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `agent_webhooks_agent_id_idx` ON `agent_webhooks` (`agent_id`);--> statement-breakpoint
CREATE INDEX `agent_webhooks_status_idx` ON `agent_webhooks` (`status`);--> statement-breakpoint
CREATE TABLE `agent_webhook_deliveries` (
	`id` text PRIMARY KEY NOT NULL,
	`webhook_id` text NOT NULL,
	`agent_id` text NOT NULL,
	`delivery_key` text NOT NULL,
	`status` text NOT NULL,
	`request_timestamp` text NOT NULL,
	`payload_json` text NOT NULL,
	`payload_summary` text NOT NULL,
	`thread_id` text,
	`run_id` text,
	`failure_reason` text,
	`claimed_at` text,
	`started_at` text,
	`finished_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`webhook_id`) REFERENCES `agent_webhooks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`thread_id`) REFERENCES `threads`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`run_id`) REFERENCES `runs`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `agent_webhook_deliveries_webhook_status_idx` ON `agent_webhook_deliveries` (`webhook_id`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `agent_webhook_deliveries_webhook_delivery_key_unique` ON `agent_webhook_deliveries` (`webhook_id`,`delivery_key`);
