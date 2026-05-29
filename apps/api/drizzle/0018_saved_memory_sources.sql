UPDATE `saved_memories`
SET `source` = 'user-generated'
WHERE `source` = 'seeded';
--> statement-breakpoint
UPDATE `saved_memories`
SET
  `scope` = 'agent',
  `associated_agent` = 'seed_agent_docs_ops'
WHERE `id` = 'seed_memory_active_work_docs';
