UPDATE `saved_memories`
SET `scope` = 'global', `associated_agent` = NULL
WHERE `scope` = 'project';
