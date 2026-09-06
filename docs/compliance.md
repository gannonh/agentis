# Provider access and evidence register

Research snapshot from September 5, 2026. This register separates documentation findings from Agentis support; the [runtime ADR](adrs/0001-runtime-and-execution-foundations.md) §5 owns provider policy. No authenticated Agentis provider workflow has been executed or certified. [KAT-3251](https://linear.app/kata-sh/issue/KAT-3251) owns eligibility, versions and transport selection; KAT-3242/KAT-3243 own live implementation proof.

| Candidate | Documented basis | Agentis status and required evidence |
| --- | --- | --- |
| Codex local | Official app-server exposes authentication, conversation history, approvals and streaming, including Codex-managed ChatGPT auth | Unverified. Compare app-server and ACP, choose one, prove required behavior and actual account eligibility. |
| Cursor local | Official ACP documents sessions, permissions and blocking question/plan extensions | Unverified. Prove native configuration isolation, auth, all blocking requests and the selected workflow. |
| Claude local | Claude ACP uses Agent SDK. Anthropic requires prior approval for third-party products offering claude.ai login/rate limits | Eligibility unresolved. Obtain documented approval or use an explicitly supported authentication path; do not infer eligibility from local credential custody. |
| Cursor, Claude and Codex cloud | Cursor: public beta v1 API, model-API billing. Claude: web sessions with CLI follow-up. Codex: experimental exec/status/list/diff/apply commands observed in local CLI 0.150.1 only | Deferred. Record actual billing, external ids, lifecycle observation/reconciliation/cancel/follow-up and a support owner before implementation. |

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
