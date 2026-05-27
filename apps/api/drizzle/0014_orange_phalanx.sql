CREATE TABLE `saved_memories` (
	`id` text PRIMARY KEY NOT NULL,
	`content` text NOT NULL,
	`category` text NOT NULL,
	`usage_guidance` text NOT NULL,
	`tags_json` text NOT NULL,
	`importance` text NOT NULL,
	`date` text NOT NULL,
	`scope` text NOT NULL,
	`associated_agent` text,
	`source` text NOT NULL,
	`provenance` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `saved_memories_category_idx` ON `saved_memories` (`category`);--> statement-breakpoint
CREATE TABLE `saved_memory_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`sort_order` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `saved_memory_categories_name_unique` ON `saved_memory_categories` (`name`);
--> statement-breakpoint
INSERT INTO `saved_memory_categories` (`id`, `name`, `description`, `sort_order`) VALUES
  ('memory_category_user_fact', 'User Fact', 'Stable details a user has shared about themselves.', 0),
  ('memory_category_preference', 'Preference', 'How a user wants agents to work or communicate.', 1),
  ('memory_category_project_context', 'Project Context', 'Durable context about active projects and product direction.', 2),
  ('memory_category_domain_knowledge', 'Domain Knowledge', 'Reusable facts and terminology for a domain.', 3),
  ('memory_category_people', 'People', 'Stakeholders, teammates, and relationship notes.', 4),
  ('memory_category_active_work', 'Active Work', 'Current workstreams and near-term execution context.', 5),
  ('memory_category_tools_workflows', 'Tools & Workflows', 'Tooling choices, process notes, and workflow habits.', 6),
  ('memory_category_organization', 'Organization', 'Company, team, and operating context.', 7);
--> statement-breakpoint
INSERT INTO `saved_memories` (
  `id`,
  `content`,
  `category`,
  `usage_guidance`,
  `tags_json`,
  `importance`,
  `date`,
  `scope`,
  `associated_agent`,
  `source`,
  `provenance`,
  `created_at`,
  `updated_at`
) VALUES
  (
    'memory_seed_agentis_m07',
    'Agentis is adding a Memories foundation so users can browse how agents learn from saved context.',
    'memory_category_project_context',
    'Use when explaining the M07 Memories work or deciding which learning surfaces should reference saved memories.',
    '["agentis","memories","m07"]',
    'high',
    '2026-05-27',
    'project',
    'Senior Reviewer',
    'seeded',
    'mocked seed memory from the M07 planning artifacts',
    '2026-05-27T00:00:00.000Z',
    '2026-05-27T00:00:00.000Z'
  ),
  (
    'memory_seed_plain_language',
    'Use concise, direct product copy when presenting learning and memory concepts.',
    'memory_category_preference',
    'Apply when drafting empty states, navigation labels, and memory card metadata.',
    '["copy","tone"]',
    'medium',
    '2026-05-27',
    'global',
    NULL,
    'seeded',
    'mocked seed memory from product direction notes',
    '2026-05-27T00:00:00.000Z',
    '2026-05-27T00:00:00.000Z'
  ),
  (
    'memory_seed_filtering',
    'Memory categories must stay visible even when they do not contain saved memories.',
    'memory_category_tools_workflows',
    'Use when implementing or reviewing category filters and category counts.',
    '["filtering","categories"]',
    'high',
    '2026-05-27',
    'project',
    NULL,
    'seeded',
    'mocked seed memory from S014 requirements',
    '2026-05-27T00:00:00.000Z',
    '2026-05-27T00:00:00.000Z'
  );
