# Agentis Agent Stack Research Matrix

## Fixed Product Context

Agentis uses the shadcn/ui Vite monorepo template as the initial web/UI foundation. Candidate stacks are evaluated for how they support the agent runtime, integrations, deployment, and operations around that foundation.

## Evaluation Criteria

Each candidate must be assessed with the same fields:

1. Fit with existing Vite/shadcn web app
2. Agent runtime fit
3. Slack integration
4. Custom web chat integration
5. Deployment model
6. Persistence and session model
7. File or knowledge source handling
8. Sandboxing model
9. Extensibility
10. Open-source viability
11. Commercial cloud path
12. Risks and constraints
13. Evidence links or hands-on notes

## Candidate Matrix Template

| Candidate     | Likely Agentis Role         | Vite/shadcn Fit                            | Agent Runtime Fit                | Slack Integration                              | Custom Web Chat                 | Deployment Model                        | Persistence / Sessions          | File / Knowledge Sources                    | Sandboxing                               | Extensibility                                   | Open-Source Viability                         | Commercial Cloud Path                                 | Risks / Constraints                     | Evidence                           |
| ------------- | --------------------------- | ------------------------------------------ | -------------------------------- | ---------------------------------------------- | ------------------------------- | --------------------------------------- | ------------------------------- | ------------------------------------------- | ---------------------------------------- | ----------------------------------------------- | --------------------------------------------- | ----------------------------------------------------- | --------------------------------------- | ---------------------------------- |
| `[candidate]` | `[primary role in Agentis]` | `[how it works with the existing web app]` | `[runtime strengths and limits]` | `[native support, adapters, or required work]` | `[SDK/API/UI integration path]` | `[where it runs and operational model]` | `[state, memory, resumability]` | `[files, RAG, mounted storage, connectors]` | `[local, VM, container, remote sandbox]` | `[plugins, tools, connectors, framework hooks]` | `[license, activity, community, maintenance]` | `[hosted SaaS feasibility, tenancy, compliance path]` | `[technical, product, operating risks]` | `[source links or hands-on notes]` |

## Current Matrix

| Candidate     | Likely Agentis Role                                                                               | Vite/shadcn Fit                                                                                                                                                          | Agent Runtime Fit                                                                                                                                         | Slack Integration                                                                                                                        | Custom Web Chat                                                                                                                        | Deployment Model                                                                                                                         | Persistence / Sessions                                                                                                                                      | File / Knowledge Sources                                                                                                                                                                   | Sandboxing                                                                                                                                            | Extensibility                                                                                                                      | Open-Source Viability                                                                     | Commercial Cloud Path                                                                                                                                                                                                                  | Risks / Constraints                                                                                                                                                                | Evidence                                                                                                                                                                                                                                                                                                                                |
| ------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Flue          | Primary agent harness and deployment framework candidate.                                         | Can run as HTTP agents behind the existing web app or as a separate agent service. Flue source can live in `./.flue/agents` or root `./agents`.                          | Strong fit for autonomous agents with sessions, prompts, skills, roles, typed schemas, tasks, shell, and runtime tools.                                   | HTTP webhook endpoints can receive Slack app events, but Slack-specific event handling, auth, and response formatting need Agentis code. | Strong fit because webhook agents expose `/agents/<name>/<id>` endpoints for chat sessions; Agentis can call them from the web app.    | Supports Node.js servers, Cloudflare Workers, CLI/CI runs, and remote sandbox connectors.                                                | Cloudflare target persists session state with Durable Objects. Node.js target uses in-memory sessions by default unless a custom store is supplied.         | Supports inline setup files, R2-backed virtual filesystems, AGENTS.md, skills, shell tools, and remote sandbox filesystems.                                                                | Defaults to fast virtual sandbox. Also supports local host sandbox, Cloudflare container sandbox, and remote sandbox connectors such as Daytona.      | High: TypeScript SDK, roles, skills, structured schemas, MCP tool adapter, connector pattern, custom tools, and session/task APIs. | Apache-2.0 TypeScript project from withastro, but marked experimental with changing APIs. | Strong Cloudflare path through Workers, R2, Durable Objects, and containers; Node path runs on VPS, Docker, Railway, Fly.io, or cloud platforms. Multi-tenant SaaS boundaries need design around sandbox choice, secrets, and storage. | API churn, Slack adapter work, custom app persistence on Node, sandbox security decisions, and product UI/orchestration work remain Agentis responsibilities.                      | [README](https://github.com/withastro/flue/blob/main/README.md), [Cloudflare deployment](https://github.com/withastro/flue/blob/main/docs/deploy-cloudflare.md), [Node deployment](https://github.com/withastro/flue/blob/main/docs/deploy-node.md), [package license](https://github.com/withastro/flue/blob/main/package.json)        |
| pi            | Coding-agent runtime, internal automation harness, and embeddable agent engine candidate.         | Can be embedded in a Node.js service or controlled through RPC, while the Vite/shadcn app owns the product UI. The `pi-web-ui` package may help with chat UI primitives. | Strong for coding agents, tool use, session state, context files, skills, prompt templates, subagent-style workflows, and extension-driven behavior.      | Integration path is custom Slack app code that invokes pi through SDK/RPC or a service wrapper.                                          | Good through SDK event subscriptions or RPC streams, but Agentis must build the HTTP/chat API layer.                                   | CLI, SDK, print mode, JSON event stream, and JSON-RPC modes. App deployment is owned by the host service.                                | SessionManager supports in-memory and persistent JSONL sessions, branching, forking, import, compaction, and tree navigation.                               | Reads AGENTS.md, skills, prompts, extensions, project files, and custom tool outputs from configured resource loaders.                                                                     | Core coding-agent tools operate in the host cwd. Stronger isolation requires running pi inside a trusted container, VM, microVM, or external sandbox. | Very high: extensions, skills, prompt templates, custom tools, themes, providers, SDK APIs, TUI components, and packages.          | MIT-licensed TypeScript monorepo with many packages and active docs.                      | Good fit for internal hosted coding-agent workers and advanced automation. Commercial cloud needs a service wrapper for tenancy, auth, sandboxing, and billing.                                                                        | Requires substantial product wrapper work for non-technical users, Slack, web chat, deployment lifecycle, and tenant isolation. Host-level tool access needs careful sandboxing.   | [README](https://github.com/earendil-works/pi/blob/main/README.md), [docs index](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/index.md), [SDK docs](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/sdk.md), [license](https://github.com/earendil-works/pi/blob/main/LICENSE)   |
| Vercel AI SDK | Web chat, model-provider abstraction, streaming UI, tool-calling, and light agent loop candidate. | Excellent fit for a Vite/React/shadcn app through React hooks and framework-agnostic UI transport patterns.                                                              | Good for LLM calls, structured output, tool calls, streaming, and `ToolLoopAgent` loops. Sandboxed harness responsibilities stay in Agentis architecture. | Integration path is custom Slack routes and tools in the Agentis backend.                                                                | Excellent for custom web chat through `useChat`, UI messages, streaming responses, tool parts, and resumable/persistent chat patterns. | Runs in TypeScript backends and frontend frameworks, with natural Vercel/Next.js deployment path and broader Node-compatible deployment. | Persistence is app-provided. Docs show loading/saving UI messages, validation with tools/metadata, server-side IDs, and stream consumption for disconnects. | Handles model message content, tool calls, attachments/data parts, and app-defined retrieval tools. Filesystem mounting and sandbox storage come from Agentis storage or sandbox services. | Application-provided via server-side tools, server actions, or external sandbox providers for code execution and file isolation.                      | High: provider adapters, tools, structured data, UI hooks, agents APIs, MCP docs, telemetry, and templates.                        | Apache-licensed TypeScript project from Vercel with broad ecosystem adoption.             | Strong for SaaS chat UX, provider abstraction, and commercial hosted app delivery. Needs additional runtime for sandboxed coding agents and durable knowledge storage.                                                                 | Agentis must design tool safety, Slack event handling, sandbox execution, long-running jobs, tenancy, and persistence. Next.js examples may need adaptation to this Vite template. | [GitHub](https://github.com/vercel/ai), [introduction](https://sdk.vercel.ai/docs/introduction), [agents overview](https://sdk.vercel.ai/docs/agents/overview), [ToolLoopAgent](https://sdk.vercel.ai/docs/reference/ai-sdk-core/tool-loop-agent), [chat persistence](https://sdk.vercel.ai/docs/ai-sdk-ui/chatbot-message-persistence) |

## Candidate Findings

### Flue

- Likely Agentis role: Primary candidate for the programmable agent harness, agent session runtime, deployment wrapper, and sandbox abstraction.
- Fit with existing Vite/shadcn web app: Flue can expose HTTP endpoints and run as a separate service behind the shadcn/Vite app. The Agentis app can own user-facing configuration, Slack connection setup, and custom chat UI while invoking Flue agents by ID.
- Agent runtime fit: Strong. Flue provides initialized agent runtimes, persistent sessions, prompts, skills, roles, typed schemas via Valibot, child tasks, shell access, MCP tools, and runtime-scoped provider settings.
- Slack integration: Plausible through webhook agents, but Flue documentation focuses on generic HTTP endpoints rather than a Slack-specific adapter. Agentis would need Slack app verification, event routing, channel/thread mapping, and response formatting.
- Custom web chat integration: Strong. Flue HTTP agents use stable agent IDs and session IDs, so the web app can create or resume conversations by calling `/agents/<name>/<id>`.
- Deployment model: Strong. Flue builds Node.js servers and Cloudflare Workers artifacts, supports local CLI/CI runs, and has a connector model for remote sandboxes.
- Persistence and session model: Strongest on Cloudflare, where Durable Objects persist message history, context, and sandbox state. Node.js uses in-memory sessions by default and needs a custom `persist` store for durable sessions.
- File or knowledge source handling: Strong. R2-backed virtual sandboxes mount a knowledge base as a filesystem searchable with grep/glob/read. Agents can also use inline files, AGENTS.md, skills, local filesystems, or remote sandbox filesystems.
- Sandboxing model: Strong and tiered. Options include default virtual sandbox, `sandbox: "local"` for trusted CI or self-hosted runs, Cloudflare containers, and remote sandbox connectors such as Daytona.
- Extensibility: Strong. Flue supports TypeScript agent code, roles, skills, structured output schemas, task delegation, MCP tools, custom tools, provider settings, and connector instructions.
- Open-source viability: Apache-2.0 TypeScript project under withastro with active positioning as experimental. API churn risk should be expected during early adoption.
- Commercial cloud path: Strong for a Cloudflare-oriented commercial path because Workers, R2, Durable Objects, and containers cover common Agentis needs. Node.js deployment is flexible for other providers, but durable storage, tenancy, and sandbox isolation require Agentis architecture.
- Risks and constraints: Flue is explicitly experimental. Slack integration and Agentis product UI are not turnkey. Node persistence is not durable by default. Local sandbox mode shares host access and must run inside a trusted isolation boundary. Multi-tenant hosted coding agents need sandbox, secret, quota, and egress controls.
- Evidence links:
  - [Flue README](https://github.com/withastro/flue/blob/main/README.md)
  - [Deploy Agents on Cloudflare](https://github.com/withastro/flue/blob/main/docs/deploy-cloudflare.md)
  - [Deploy Agents on Node.js](https://github.com/withastro/flue/blob/main/docs/deploy-node.md)
  - [package.json license](https://github.com/withastro/flue/blob/main/package.json)

### pi

- Likely Agentis role: Embeddable coding-agent engine for internal automation, code agents, harness experiments, or backend workers that need rich tool use and session control.
- Fit with existing Vite/shadcn web app: Good if Agentis hosts pi in a Node.js service and streams events into the web app. The web app still needs to provide configuration screens, agent catalogs, Slack setup, and custom chat surfaces.
- Agent runtime fit: Strong for coding-agent workflows. The SDK exposes `createAgentSession`, event subscriptions, tools, custom tools, resource loaders, sessions, branching, compaction, and run modes. Pi's docs also cover skills, extensions, prompt templates, custom providers, packages, and TUI components.
- Slack integration: Build through custom Slack app code that calls pi via SDK/RPC or a service wrapper. Pi's documented integration surfaces are SDK, JSON event stream mode, RPC mode, extensions, and custom tools.
- Custom web chat integration: Good through SDK event subscriptions or JSON/RPC streams. Agentis would need a stable HTTP API and frontend message model around pi sessions.
- Deployment model: The pi coding agent is a CLI and SDK. Production deployment for Agentis would be a custom Node.js worker/service, container, VM, or microVM that runs pi sessions.
- Persistence and session model: Strong for agent sessions. `SessionManager` supports in-memory sessions, persistent sessions, listing, opening, branching, forking, labels, import, and tree traversal.
- File or knowledge source handling: Strong for repository and filesystem-oriented agents through tools, AGENTS.md, skills, prompts, extensions, context files, and custom resource loaders. Product knowledge bases would need storage adapters or custom tools.
- Sandboxing model: Pi tools operate in the configured working directory. Hosted Agentis must isolate sessions by running pi inside trusted containers, VMs, microVMs, or external sandboxes.
- Extensibility: Very strong. Pi supports TypeScript extensions, custom tools, skills, prompt templates, custom providers, models, themes, TUI components, and packages.
- Open-source viability: MIT-licensed TypeScript monorepo with documented packages for coding agent, agent core, AI provider API, TUI, and web UI.
- Commercial cloud path: Good for advanced coding-agent workers or internal automation. Agentis must provide tenancy, auth, quotas, billing, sandbox lifecycle, and deployment management.
- Risks and constraints: Pi is optimized for agent-harness and coding-agent use. Non-technical deployment UX, Slack, web chat, app-level persistence, and sandbox isolation need product infrastructure.
- Evidence links:
  - [Pi README](https://github.com/earendil-works/pi/blob/main/README.md)
  - [Pi docs index](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/index.md)
  - [Pi SDK docs](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/sdk.md)
  - [Pi license](https://github.com/earendil-works/pi/blob/main/LICENSE)

### Vercel AI SDK

- Likely Agentis role: Web-chat foundation, model-provider abstraction, streaming UI layer, typed tool-calling layer, and lightweight agent loop.
- Fit with existing Vite/shadcn web app: Excellent for React UI integration. AI SDK UI provides hooks such as `useChat` and transport patterns that can be styled with shadcn components.
- Agent runtime fit: Good for tool-calling and agent loops. AI SDK Core supports generation, structured objects, tool calls, streaming, and `ToolLoopAgent` for multi-step tool use. Filesystem sandboxing and deployment harnessing remain Agentis architecture concerns.
- Slack integration: Build custom Slack event routes in the Agentis backend, then call AI SDK Core functions or agents from those routes.
- Custom web chat integration: Excellent. Docs cover `useChat`, UI messages, streaming responses, initial messages, message IDs, tool validation, and persistence callbacks.
- Deployment model: TypeScript library usable in React, Next.js, Vue, Svelte, Node.js, and related runtimes. It is most aligned with Vercel/Next.js examples but can be used from a Vite app and Node-compatible backend.
- Persistence and session model: App-provided. The persistence guide shows load/save flows, server-side IDs, validation, and disconnect handling, but Agentis must choose the database and schema.
- File or knowledge source handling: Implement through app tools, retrieval tools, attachments/data parts, or external services. Filesystem mounting and sandbox storage belong in Agentis storage or sandbox services.
- Sandboxing model: App-provided. Use server-side tools for safe operations and external sandbox providers for code execution or file isolation.
- Extensibility: High. Provider abstraction, tools, structured outputs, agent loops, UI hooks, MCP-related docs, telemetry options, templates, and framework coverage make it flexible for product development.
- Open-source viability: Apache-licensed TypeScript project from Vercel with broad public ecosystem usage.
- Commercial cloud path: Strong for SaaS chat UI and model-provider abstraction. Pair with a durable database, background job system, sandbox provider, and Agentis deployment controls.
- Risks and constraints: Agentis must supply durable orchestration, sandbox execution, long-running jobs, Slack event handling, tenant boundaries, secrets handling, and knowledge storage. Some docs and examples center on Next.js, so the current Vite template needs integration work.
- Evidence links:
  - [Vercel AI SDK GitHub](https://github.com/vercel/ai)
  - [AI SDK introduction](https://sdk.vercel.ai/docs/introduction)
  - [Agents overview](https://sdk.vercel.ai/docs/agents/overview)
  - [ToolLoopAgent reference](https://sdk.vercel.ai/docs/reference/ai-sdk-core/tool-loop-agent)
  - [Chatbot message persistence](https://sdk.vercel.ai/docs/ai-sdk-ui/chatbot-message-persistence)

## Per-Candidate Notes Template

### `[Candidate]`

- Likely Agentis role:
- Fit with existing Vite/shadcn web app:
- Agent runtime fit:
- Slack integration:
- Custom web chat integration:
- Deployment model:
- Persistence and session model:
- File or knowledge source handling:
- Sandboxing model:
- Extensibility:
- Open-source viability:
- Commercial cloud path:
- Risks and constraints:
- Evidence links:

## Synthesis Template

### Strongest Candidates for Hands-On Validation

- `[candidate]`: `[why it should be validated next]`

### Candidates to Exclude or Defer

- `[candidate]`: `[reason]`

### Unresolved Questions for Next Slice

- `[question]`: `[prototype or inspection check]`

## Verification Checklist

- [ ] Flue is evaluated.
- [ ] pi is evaluated.
- [ ] Vercel AI SDK is evaluated.
- [ ] At least two additional related open-source alternatives are evaluated.
- [ ] Every candidate uses the same criteria.
- [ ] Every material claim includes an evidence link or hands-on note.
- [ ] The synthesis names strongest candidate paths for hands-on validation.
- [ ] The synthesis records unresolved questions and next checks.
