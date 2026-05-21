CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`thread_id` text NOT NULL,
	`role` text NOT NULL,
	`parts_json` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`thread_id`) REFERENCES `threads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `run_steps` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`type` text NOT NULL,
	`status` text NOT NULL,
	`title` text NOT NULL,
	`payload_json` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `runs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `runs` (
	`id` text PRIMARY KEY NOT NULL,
	`thread_id` text NOT NULL,
	`status` text NOT NULL,
	`model` text NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text,
	`error_summary` text,
	`usage_json` text,
	`cost` real,
	FOREIGN KEY (`thread_id`) REFERENCES `threads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `threads` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`status` text NOT NULL,
	`model` text NOT NULL,
	`mode` text NOT NULL,
	`project_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
