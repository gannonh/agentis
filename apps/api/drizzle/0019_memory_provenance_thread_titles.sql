UPDATE `saved_memories`
SET `provenance` = `source_thread_title`
WHERE `source` = 'thread-derived'
  AND `source_thread_title` IS NOT NULL;
