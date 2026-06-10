ALTER TABLE `rubrics` ADD `criteria_json` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `runs` ADD `evaluation_json` text;
