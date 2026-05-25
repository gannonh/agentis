ALTER TABLE `agent_configuration_versions` ADD `tool_grants_json` text DEFAULT '[]' NOT NULL;
--> statement-breakpoint
UPDATE `agent_configuration_versions` AS `version`
SET `tool_grants_json` = COALESCE(
  (
    SELECT json_group_array(
      json_object(
        'toolkitSlug', `snapshot_grants`.`toolkit_slug`,
        'connectionId', `snapshot_grants`.`connection_id`
      )
    )
    FROM (
      SELECT `grant`.`toolkit_slug`, `grant`.`connection_id`
      FROM `tool_access_grants` AS `grant`
      WHERE `grant`.`scope_type` = 'agent'
        AND `grant`.`scope_id` = `version`.`agent_id`
      ORDER BY `grant`.`toolkit_slug`, `grant`.`connection_id`
    ) AS `snapshot_grants`
  ),
  '[]'
)
WHERE `version`.`version` = (
  SELECT MAX(`latest`.`version`)
  FROM `agent_configuration_versions` AS `latest`
  WHERE `latest`.`agent_id` = `version`.`agent_id`
);
