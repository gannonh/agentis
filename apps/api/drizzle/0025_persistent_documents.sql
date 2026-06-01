ALTER TABLE `artifacts` RENAME TO `documents`;--> statement-breakpoint
ALTER TABLE `documents` RENAME COLUMN `type` TO `document_type`;--> statement-breakpoint
ALTER TABLE `documents` ADD COLUMN `content_format` text NOT NULL DEFAULT 'text';--> statement-breakpoint
ALTER TABLE `documents` ADD COLUMN `visibility_scope` text NOT NULL DEFAULT 'thread';--> statement-breakpoint
ALTER TABLE `documents` ADD COLUMN `current_version_id` text;--> statement-breakpoint
ALTER TABLE `documents` ADD COLUMN `current_version` integer;--> statement-breakpoint
UPDATE `documents`
SET `document_type` = CASE
  WHEN `document_type` = 'document' THEN 'markdown'
  ELSE `document_type`
END,
`content_format` = CASE
  WHEN `document_type` = 'document' THEN 'markdown'
  WHEN `mime_type` LIKE 'text/%' THEN 'text'
  ELSE 'binary'
END,
`visibility_scope` = CASE
  WHEN `project_id` IS NOT NULL THEN 'project'
  WHEN `thread_id` IS NOT NULL THEN 'thread'
  ELSE 'global'
END;--> statement-breakpoint
CREATE TABLE `document_versions` (
  `id` text PRIMARY KEY NOT NULL,
  `document_id` text NOT NULL,
  `version` integer NOT NULL,
  `content_hash` text NOT NULL,
  `content_storage_key` text NOT NULL,
  `change_summary` text,
  `created_by_run_id` text,
  `created_by_thread_id` text,
  `created_at` text NOT NULL,
  FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`created_by_run_id`) REFERENCES `runs`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`created_by_thread_id`) REFERENCES `threads`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint
INSERT INTO `document_versions` (
  `id`,
  `document_id`,
  `version`,
  `content_hash`,
  `content_storage_key`,
  `change_summary`,
  `created_by_run_id`,
  `created_by_thread_id`,
  `created_at`
)
SELECT
  'document_version_' || `id`,
  `id`,
  1,
  'migrated:' || `storage_key`,
  `storage_key`,
  'Migrated existing library item to document',
  `run_id`,
  `thread_id`,
  `created_at`
FROM `documents`
WHERE `document_type` = 'markdown';--> statement-breakpoint
UPDATE `documents`
SET `current_version_id` = 'document_version_' || `id`,
`current_version` = 1
WHERE `document_type` = 'markdown';--> statement-breakpoint
CREATE INDEX `documents_type_idx` ON `documents` (`document_type`);--> statement-breakpoint
CREATE INDEX `documents_visibility_scope_idx` ON `documents` (`visibility_scope`);--> statement-breakpoint
CREATE INDEX `documents_project_id_idx` ON `documents` (`project_id`);--> statement-breakpoint
CREATE INDEX `documents_thread_id_idx` ON `documents` (`thread_id`);--> statement-breakpoint
CREATE INDEX `documents_run_id_idx` ON `documents` (`run_id`);--> statement-breakpoint
CREATE INDEX `documents_updated_at_idx` ON `documents` (`updated_at`);--> statement-breakpoint
CREATE INDEX `document_versions_document_id_idx` ON `document_versions` (`document_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `document_versions_document_version_unique` ON `document_versions` (`document_id`,`version`);
