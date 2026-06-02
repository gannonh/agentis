CREATE TABLE `workspaces` (
  `id` text PRIMARY KEY NOT NULL,
  `agent_id` text NOT NULL,
  `name` text NOT NULL,
  `backend_type` text NOT NULL,
  `backend_ref` text NOT NULL,
  `status` text NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workspaces_agent_id_unique` ON `workspaces` (`agent_id`);
--> statement-breakpoint
CREATE INDEX `workspaces_status_idx` ON `workspaces` (`status`);
--> statement-breakpoint
INSERT INTO `agents` (
  `id`,
  `name`,
  `description`,
  `system_prompt`,
  `model`,
  `max_cost_per_run_usd`,
  `source_thread_id`,
  `source_thread_title`,
  `source_workflow_json`,
  `created_at`,
  `updated_at`
)
SELECT
  'agent_agentis',
  'Agentis',
  'General Agentis assistant.',
  'You are Agentis, a helpful workspace assistant. Be concise.',
  'openai/gpt-4o-mini',
  NULL,
  NULL,
  NULL,
  NULL,
  '2026-05-29T00:00:00.000Z',
  '2026-05-29T00:00:00.000Z'
WHERE NOT EXISTS (SELECT 1 FROM `agents` WHERE `id` = 'agent_agentis');
--> statement-breakpoint
INSERT INTO `agent_configuration_versions` (
  `id`,
  `agent_id`,
  `version`,
  `system_prompt`,
  `model`,
  `max_cost_per_run_usd`,
  `tool_grants_json`,
  `created_at`
)
SELECT
  'agent_version_agentis_v1',
  'agent_agentis',
  1,
  'You are Agentis, a helpful workspace assistant. Be concise.',
  'openai/gpt-4o-mini',
  NULL,
  '[]',
  '2026-05-29T00:00:00.000Z'
WHERE NOT EXISTS (
  SELECT 1 FROM `agent_configuration_versions` WHERE `agent_id` = 'agent_agentis'
);
--> statement-breakpoint
INSERT INTO `workspaces` (
  `id`,
  `agent_id`,
  `name`,
  `backend_type`,
  `backend_ref`,
  `status`,
  `created_at`,
  `updated_at`
)
SELECT
  CASE WHEN `id` = 'agent_agentis' THEN 'workspace_agentis' ELSE 'workspace_' || `id` END,
  `id`,
  CASE WHEN `id` = 'agent_agentis' THEN 'Agentis workspace' ELSE `name` || ' workspace' END,
  'local-fs',
  'workspaces/' || CASE WHEN `id` = 'agent_agentis' THEN 'workspace_agentis' ELSE 'workspace_' || `id` END,
  'active',
  '2026-05-29T00:00:00.000Z',
  '2026-05-29T00:00:00.000Z'
FROM `agents`;
--> statement-breakpoint
ALTER TABLE `threads` ADD `workspace_id` text REFERENCES workspaces(id);
--> statement-breakpoint
UPDATE `threads`
SET
  `agent_id` = 'agent_agentis',
  `agent_name_snapshot` = 'Agentis',
  `updated_at` = '2026-05-29T00:00:00.000Z'
WHERE `agent_id` IS NULL;
--> statement-breakpoint
UPDATE `threads`
SET `workspace_id` = (
  SELECT `workspaces`.`id`
  FROM `workspaces`
  WHERE `workspaces`.`agent_id` = `threads`.`agent_id`
  LIMIT 1
)
WHERE `workspace_id` IS NULL;
