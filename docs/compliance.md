# Provider access and evidence register

The September 11, 2026 [KAT-3247 verification](verification/kat-3247/README.md) exercised product commit `e2769a79f7e59d7c4d5c771a29a6874f2151df2b` on macOS Apple silicon with Docker Desktop. Codex app-server and direct Claude Agent SDK each passed the six live scratch cases. All nine Gate 0 verification criteria pass, including native rejected-handoff ownership and packaged fixture isolation. At handoff, merge and milestone closure remain pending; Gate 1 has not been started or approved.

The [runtime ADR](adrs/0001-runtime-and-execution-foundations.md) owns provider policy. [KAT-3251 research](research/provider-contracts/README.md) is the September 6 research snapshot. Its initial Cursor selection was superseded by the [recorded KAT-3243 replacement](verification/kat-3243/README.md). Historical failed-provider receipts remain evidence of that decision.

| Provider | Access and transport recorded for this run | Observed support and limits |
| --- | --- | --- |
| Codex local | App-server 0.153.4 over stdio, Codex-managed ChatGPT login, model `gpt-5.6-sol`, medium effort | Selected. Live scratch output, allow, deny, native plan output, structured input, cancel and history loading passed on macOS Docker Desktop. Dedicated blocking native plan approval is unavailable. Invoice attribution and interrupted-action recovery were not verified. |
| Claude local | Direct Agent SDK 0.3.263, native CLI 2.1.263, scoped Anthropic API-key auth, model `claude-sonnet-5`, medium effort | Selected. Live scratch output, allow, deny, AskUserQuestion plan rejection, structured input, cancel and history loading passed. Accepted specialist handoff and concurrent stop-all passed. Native rejection with retained sender ownership passed. API usage is billed through the provisioned Anthropic account; this run did not reconcile invoices or certify subscription access. |
| Cursor local | Historical CLI 2026.09.02-c22c1a3 over ACP | Rejected after the retained live failures. Runtime paths were removed. Cursor is not an advertised provider or fallback. |
| Cloud providers | Separate remote execution, entitlement, billing and lifecycle contracts | Deferred. No cloud calls or parity claim. |

Gannon Hall owns integration and support. The [provider setup](provider-setup.md) documents authentication custody and container prerequisites. This run reused dedicated provider credential volumes and existing pinned images. It did not demonstrate clean login or fresh image provisioning. Provider credentials remain available to their native tools inside their own container; they are separate from Agentis owner credentials.

Provider-session loading is history loading, not interrupted-action recovery. MCP and attachments remain unavailable. The installed fixture launcher passed exact container-policy and 14 host-resource/network denial checks. Its fresh fixture token/database and image-local executables remain intentionally available inside the offline boundary. Generic direct fake serving remains explicitly unverified. The [gate matrix](verification/kat-3247/README.md) records those distinctions and every requirement verdict.

Each supported integration records exact binary/SDK/protocol versions, source retrieval date, eligibility basis, model/capability discovery, real workflow evidence, limits, maintainer and incompatibility handling.

The following references belong to the earlier research snapshot. Their policies were not re-fetched or recertified during this verification run:

- [Anthropic Agent SDK policy](https://code.claude.com/docs/en/agent-sdk/overview)
- [Claude ACP adapter](https://raw.githubusercontent.com/agentclientprotocol/claude-agent-acp/main/README.md)
- [Codex app-server](https://learn.chatgpt.com/docs/app-server)
- [ACP session setup](https://agentclientprotocol.com/protocol/v1/session-setup)
- [Cursor ACP](https://prod.cursor.com/docs/cli/acp)
- [Cursor Cloud Agents API](https://prod.cursor.com/docs/cloud-agent/api/endpoints)
- [Cursor cloud billing](https://cursor.com/docs/cloud-agent)
- [Claude cloud sessions](https://code.claude.com/docs/en/claude-code-on-the-web)
- [MCP transport security](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)
