ALTER TABLE `agent_promotion_drafts` ADD `proposed_tool_grants_json` text DEFAULT '[]' NOT NULL;
--> statement-breakpoint
ALTER TABLE `agent_promotion_drafts` ADD `unsupported_source_steps_json` text DEFAULT '[]' NOT NULL;
