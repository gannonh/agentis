ALTER TABLE `saved_memories` ADD `associated_agents_json` text;
--> statement-breakpoint
UPDATE `saved_memories`
SET `associated_agents_json` = json_array(`associated_agent`)
WHERE `associated_agent` IS NOT NULL;
--> statement-breakpoint
UPDATE `saved_memories`
SET `associated_agents_json` = '[]'
WHERE `associated_agents_json` IS NULL;
