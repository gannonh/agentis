ALTER TABLE `saved_memories` ADD `source_thread_id` text;
--> statement-breakpoint
ALTER TABLE `saved_memories` ADD `source_thread_title` text;
--> statement-breakpoint
UPDATE `saved_memories`
SET
  `scope` = 'agent',
  `associated_agent` = 'seed_agent_support_triage',
  `source` = 'thread-derived',
  `source_thread_id` = 'seed_thread_support_triage',
  `source_thread_title` = 'Support escalations triage',
  `provenance` = 'Support escalations triage'
WHERE `id` = 'seed_memory_preference_concise';
--> statement-breakpoint
UPDATE `saved_memories`
SET
  `scope` = 'agent',
  `associated_agent` = 'seed_agent_launch_pm',
  `source` = 'thread-derived',
  `source_thread_id` = 'seed_thread_launch_plan',
  `source_thread_title` = 'Launch readiness weekly update',
  `provenance` = 'Launch readiness weekly update'
WHERE `id` IN (
  'seed_memory_project_context_launch',
  'seed_memory_tools_workflows_debug',
  'seed_memory_org_beta'
);
--> statement-breakpoint
UPDATE `saved_memories`
SET
  `scope` = 'agent',
  `associated_agent` = 'seed_agent_research_librarian',
  `source` = 'thread-derived',
  `source_thread_id` = 'seed_thread_research_brief',
  `source_thread_title` = 'Configuration pattern research brief',
  `provenance` = 'Configuration pattern research brief'
WHERE `id` = 'seed_memory_people_design';
--> statement-breakpoint
UPDATE `saved_memories`
SET
  `source` = 'thread-derived',
  `source_thread_id` = 'seed_thread_docs_refresh',
  `source_thread_title` = 'Docs refresh checklist',
  `provenance` = 'Docs refresh checklist'
WHERE `id` = 'seed_memory_active_work_docs';
--> statement-breakpoint
UPDATE `saved_memories`
SET
  `scope` = 'agent',
  `associated_agent` = 'seed_agent_customer_insights',
  `source` = 'thread-derived',
  `source_thread_id` = 'seed_thread_customer_voice',
  `source_thread_title` = 'Customer voice synthesis',
  `provenance` = 'Customer voice synthesis'
WHERE `id` IN (
  'seed_memory_domain_onboarding',
  'seed_memory_user_fact_builder'
);
