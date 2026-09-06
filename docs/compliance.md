# Provider access and evidence register

Research snapshot from September 6, 2026. This register separates documentation findings from Agentis support; the [runtime ADR](adrs/0001-runtime-and-execution-foundations.md) §5 owns provider policy. [KAT-3251 research](research/provider-contracts/README.md) selects Codex stdio app-server and Cursor stdio ACP, with disposable live evidence and explicit support blockers. No authenticated Agentis application workflow has been executed or certified. KAT-3242/KAT-3243 own live implementation proof.

| Candidate | Documented basis | Agentis status and required evidence |
| --- | --- | --- |
| Codex local | App-server 0.153.4 over stdio, Codex-managed ChatGPT login; compared with current codex-acp 1.10.0 | Selected for implementation. Disposable Linux allow/deny/input/cancel/load evidence exists. Product, macOS, isolation, and recovery support remain unverified. Maintainer Gannon Hall. |
| Cursor local | CLI 2026.09.02-c22c1a3, ACP v1 over stdio, explicit Cursor user API-key mode | Selected with blocking-input support blocked. Linux model/allow/deny/cancel/load evidence exists; question probe emitted no structured request. Native isolation, billing attribution, and product/macOS evidence remain unverified. Maintainer Gannon Hall. |
| Claude local | SDK 0.3.263 documents an eligible API-key path. Current ACP 0.75.1 pins SDK 0.3.257. Third-party claude.ai access requires prior approval | API-auth alternative documented but not selected or live verified. No API key was available to this run. Subscription integration unavailable without approval; local credential custody does not resolve eligibility. |
| Cursor, Claude and Codex cloud | Separate remote execution, entitlement, billing, and lifecycle contracts | Deferred. See the four-target table and exact unknowns in the research. No cloud calls or parity claim. |

Each supported integration records exact binary/SDK/protocol versions, source retrieval date, eligibility basis, model/capability discovery, real workflow evidence, limits, maintainer and incompatibility handling.

Reference findings were checked during the project review and must be refreshed during provider selection:

- [Anthropic Agent SDK policy](https://code.claude.com/docs/en/agent-sdk/overview)
- [Claude ACP adapter](https://raw.githubusercontent.com/agentclientprotocol/claude-agent-acp/main/README.md)
- [Codex app-server](https://learn.chatgpt.com/docs/app-server)
- [ACP session setup](https://agentclientprotocol.com/protocol/v1/session-setup)
- [Cursor ACP](https://prod.cursor.com/docs/cli/acp)
- [Cursor Cloud Agents API](https://prod.cursor.com/docs/cloud-agent/api/endpoints)
- [Cursor cloud billing](https://cursor.com/docs/cloud-agent)
- [Claude cloud sessions](https://code.claude.com/docs/en/claude-code-on-the-web)
- [MCP transport security](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)
