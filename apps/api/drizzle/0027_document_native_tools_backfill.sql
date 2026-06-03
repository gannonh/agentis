UPDATE `agent_configuration_versions`
SET `native_tools_json` = CASE
  WHEN `native_tools_json` LIKE '%"webSearch"%'
    THEN '["documents","webSearch"]'
  ELSE '["documents"]'
END
WHERE `native_tools_json` NOT LIKE '%"documents"%';
