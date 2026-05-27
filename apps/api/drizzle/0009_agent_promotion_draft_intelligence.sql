ALTER TABLE `agent_promotion_drafts` ADD `intelligence_json` text DEFAULT '{}' NOT NULL;
--> statement-breakpoint
ALTER TABLE `agent_promotion_drafts` ADD `edited_fields_json` text DEFAULT '[]' NOT NULL;
