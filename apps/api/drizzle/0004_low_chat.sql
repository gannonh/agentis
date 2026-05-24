CREATE TABLE `agent_configuration_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`agent_id` text NOT NULL,
	`version` integer NOT NULL,
	`system_prompt` text NOT NULL,
	`model` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `agent_configuration_versions_agent_id_idx` ON `agent_configuration_versions` (`agent_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `agent_configuration_versions_agent_version_unique` ON `agent_configuration_versions` (`agent_id`,`version`);--> statement-breakpoint
CREATE TABLE `agents` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`system_prompt` text NOT NULL,
	`model` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `agents_name_idx` ON `agents` (`name`);--> statement-breakpoint
CREATE INDEX `agents_updated_at_idx` ON `agents` (`updated_at`);