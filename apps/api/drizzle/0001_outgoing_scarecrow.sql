CREATE TABLE `integration_toolkits` (
	`slug` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`category` text NOT NULL,
	`featured` integer NOT NULL,
	`auth_config_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `integration_connections` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`toolkit_slug` text NOT NULL,
	`composio_connected_account_id` text,
	`composio_connection_request_id` text,
	`status` text NOT NULL,
	`account_label` text,
	`scopes_json` text,
	`error_code` text,
	`error_message` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`toolkit_slug`) REFERENCES `integration_toolkits`(`slug`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `integration_connections_user_id_idx` ON `integration_connections` (`user_id`);
--> statement-breakpoint
CREATE INDEX `integration_connections_toolkit_slug_idx` ON `integration_connections` (`toolkit_slug`);
--> statement-breakpoint
CREATE TABLE `tool_access_grants` (
	`id` text PRIMARY KEY NOT NULL,
	`scope_type` text NOT NULL,
	`scope_id` text NOT NULL,
	`toolkit_slug` text NOT NULL,
	`connection_id` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`toolkit_slug`) REFERENCES `integration_toolkits`(`slug`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`connection_id`) REFERENCES `integration_connections`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `tool_access_grants_scope_idx` ON `tool_access_grants` (`scope_type`,`scope_id`);
--> statement-breakpoint
CREATE INDEX `tool_access_grants_connection_id_idx` ON `tool_access_grants` (`connection_id`);
