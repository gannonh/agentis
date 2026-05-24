ALTER TABLE `threads` ADD `agent_id` text REFERENCES agents(id);
--> statement-breakpoint
ALTER TABLE `threads` ADD `agent_name_snapshot` text;
--> statement-breakpoint
ALTER TABLE `runs` ADD `agent_id` text REFERENCES agents(id);
--> statement-breakpoint
ALTER TABLE `runs` ADD `agent_configuration_version_id` text REFERENCES agent_configuration_versions(id);
