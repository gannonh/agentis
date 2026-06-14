---
type: ADR
title: Version Native Tool Permissions With Agent Configuration
description: "Agentis distinguishes native tools from integrations: tools are Agentis-owned agent capabilities, while integrations ..."
tags: []
timestamp: "2026-06-14T00:00:00Z"
---
# Version Native Tool Permissions With Agent Configuration

Agentis distinguishes native tools from integrations: tools are Agentis-owned agent capabilities, while integrations connect agents to external software or data sources. Native tool permissions will be stored as versioned agent configuration, separate from Composio integration grants, so a run can be tied to the exact tool capabilities that were available to the agent version it used.