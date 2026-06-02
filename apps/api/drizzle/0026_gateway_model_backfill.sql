UPDATE `agents`
SET `model` = 'openai/gpt-4o-mini'
WHERE `id` = 'agent_agentis'
  AND `model` = 'gpt-4o-mini';
--> statement-breakpoint
UPDATE `agent_configuration_versions`
SET `model` = 'openai/gpt-4o-mini'
WHERE `id` = 'agent_version_agentis_v1'
  AND `agent_id` = 'agent_agentis'
  AND `model` = 'gpt-4o-mini';
