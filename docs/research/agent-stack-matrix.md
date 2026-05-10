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
| Mastra        | TypeScript agent application framework and production agent backend candidate.                    | Good fit because Mastra integrates with React, Next.js, Node, and standalone endpoints; the Vite/shadcn app can call Mastra APIs.                                        | Strong for agents, tools, workflows, memory, RAG, evals, observability, and multi-agent systems.                                                          | Mastra docs list channels for Slack, Discord, and Telegram as an agent expansion path.                                                   | Good via standalone endpoints, Mastra Client, and UI integrations with Vercel AI SDK UI or CopilotKit.                                 | Standalone server, existing app adapters, serverless deployers, cloud provider guides, and Mastra Cloud.                                 | Strong: storage-backed workflows, suspend/resume, memory, semantic recall, and conversation history.                                                        | Strong: RAG/data-source patterns, APIs, databases, files, tools, and MCP servers.                                                                                                          | Application-provided. Use platform isolation, containers, or external sandbox tools for code execution.                                               | High: agents, workflows, tools, MCP servers, channels, memory, evals, observability, Studio, and server adapters.                  | Core is Apache-2.0 with enterprise-licensed `ee/` areas.                                  | Strong for commercial SaaS agent backends with optional Mastra Cloud and deployers.                                                                                                                                                    | License boundary review, product integration work, sandbox design, and alignment with existing Vite template remain required.                                                      | [GitHub](https://github.com/mastra-ai/mastra), [agents overview](https://mastra.ai/docs/agents/overview), [server deployment](https://mastra.ai/en/docs/deployment/server), [cloud deployment](https://mastra.ai/en/docs/deployment/cloud-providers), [storage](https://mastra.ai/en/docs/storage/overview)                             |
| LangGraph.js  | Durable workflow and agent orchestration runtime candidate.                                       | Good fit through the Vite option in `create-agent-chat-app` or a backend graph service called by the web app.                                                            | Strong for long-running stateful agents, graph orchestration, streaming, memory, human-in-the-loop, and multi-agent systems.                              | Integration path is custom Slack app code that invokes graph endpoints or LangGraph Platform APIs.                                       | Good through full-stack chat templates, streaming, and graph APIs; Agentis owns the shadcn UI.                                         | Open-source package, self-hosted services, full-stack quickstart, and LangGraph Platform/LangSmith deployment options.                   | Very strong: durable execution, checkpoints, memory, threads, and resume patterns.                                                                          | Good through LangChain tools, retrieval components, Deep Agents filesystem features, and app-defined resources.                                                                            | Application-provided. Pair with Deep Agents, containers, or external sandboxes for filesystem and code execution isolation.                           | High: low-level graph primitives, LangChain integrations, Deep Agents, LangSmith, Studio, templates, and platform APIs.            | MIT-licensed TypeScript package backed by LangChain ecosystem.                            | Strong for sophisticated long-running orchestration and enterprise deployments.                                                                                                                                                        | Lower-level primitives increase design effort; commercial platform choices need review; sandbox and product UI remain Agentis responsibilities.                                    | [GitHub](https://github.com/langchain-ai/langgraphjs), [overview](https://docs.langchain.com/oss/javascript/langgraph), [README](https://github.com/langchain-ai/langgraphjs/blob/main/README.md)                                                                                                                                       |
| CopilotKit    | Agent-native React UI, generative UI, shared state, and human-in-the-loop frontend candidate.     | Excellent React fit for shadcn-style UI because it provides React hooks, headless UI options, and chat components.                                                       | Medium as an agent runtime; strongest as agent-app UI/state layer that connects to external agents.                                                       | Integration path is custom Slack backend plus shared agent state; CopilotKit primarily targets in-app UI.                                | Excellent for chat UI, generative UI, agent state sync, in-app actions, and human-in-the-loop UX.                                      | React/Angular frontend packages, app integration CLI, Copilot Cloud, and AG-UI protocol.                                                 | Shared state and session UX are core frontend features; durable backend persistence depends on the connected agent/backend.                                 | Strong for UI state, app context, actions, and tool-rendered UI; knowledge retrieval belongs in the backend agent runtime.                                                                 | Application-provided through the connected backend agent and tools.                                                                                   | High for frontend: hooks, components, AG-UI, in-app actions, shared state, generative UI, inspector, and headless mode.            | MIT-licensed open-source core with premium team features.                                 | Strong for commercial UI experience and agent control surfaces; pair with Flue, Mastra, LangGraph, pi, or AI SDK for backend runtime.                                                                                                  | Runtime/backend selection remains open; Slack, sandboxing, persistence, and deployment backend are Agentis responsibilities.                                                       | [GitHub README](https://github.com/CopilotKit/CopilotKit/blob/main/README.md), [framework](https://www.copilotkit.ai/product/framework), [docs](https://docs.copilotkit.ai/)                                                                                                                                                            |

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
- Risks and constraints: Flue is explicitly experimental. Slack integration and Agentis product UI require implementation. Node persistence uses in-memory storage by default. Local sandbox mode shares host access and must run inside a trusted isolation boundary. Multi-tenant hosted coding agents need sandbox, secret, quota, and egress controls.
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

### Mastra

- Likely Agentis role: TypeScript agent application framework for production agent backends, workflows, memory, retrieval, observability, and multi-agent systems.
- Fit with existing Vite/shadcn web app: Good. Mastra can expose agents and workflows as API endpoints, run as a standalone server, or integrate with React/Node applications. The existing web app can own the product UI and call Mastra endpoints.
- Agent runtime fit: Strong. Agents use LLMs and tools for open-ended tasks, can be composed into workflows or multi-agent systems, and support memory, structured responses, guardrails, evals, and observability.
- Slack integration: Mastra docs list channels for Slack, Discord, and Telegram as an expansion path for agents.
- Custom web chat integration: Good through endpoints, Mastra Client, and documented integrations with Vercel AI SDK UI and CopilotKit.
- Deployment model: Standalone server, existing app/server adapters, serverless deployers, cloud provider guides, and Mastra Cloud.
- Persistence and session model: Strong. Mastra uses storage for workflows, suspend/resume, human-in-the-loop, memory, conversation history, and semantic recall.
- File or knowledge source handling: Strong through RAG, APIs, databases, files, tools, MCP servers, and memory systems.
- Sandboxing model: Application-provided through platform isolation, containers, or external sandbox tools when agents need code execution.
- Extensibility: High. Agents, workflows, tools, MCP servers, channels, memory, evals, observability, Studio, and server adapters cover many Agentis backend needs.
- Open-source viability: Core framework is Apache-2.0. Enterprise-licensed `ee/` areas require review before commercial use.
- Commercial cloud path: Strong for a SaaS backend with deployers, observability, storage, and optional Mastra Cloud.
- Risks and constraints: Agentis must review licensing boundaries, decide whether Mastra Cloud belongs in the stack, integrate with the current Vite template, and design sandboxing for coding agents.
- Evidence links:
  - [Mastra GitHub](https://github.com/mastra-ai/mastra)
  - [Agents overview](https://mastra.ai/docs/agents/overview)
  - [Server deployment](https://mastra.ai/en/docs/deployment/server)
  - [Cloud deployment](https://mastra.ai/en/docs/deployment/cloud-providers)
  - [Storage overview](https://mastra.ai/en/docs/storage/overview)

### LangGraph.js

- Likely Agentis role: Durable orchestration runtime for long-running, stateful, human-supervised agent workflows.
- Fit with existing Vite/shadcn web app: Good. The full-stack quickstart supports Vite, and Agentis can also call a backend graph service from its own shadcn UI.
- Agent runtime fit: Strong for graph-controlled agents, durable execution, state, memory, streaming, multi-agent systems, and human-in-the-loop workflows.
- Slack integration: Build Slack app routes that invoke graph endpoints or platform APIs.
- Custom web chat integration: Good through full-stack templates, streaming, and stateful graph APIs. Agentis can build the visible chat surface in shadcn.
- Deployment model: Open-source package for self-hosted applications, full-stack chat quickstart, and LangGraph Platform/LangSmith deployment options.
- Persistence and session model: Very strong. LangGraph emphasizes durable execution, checkpoints, memory, threads, human-in-the-loop, and resume behavior.
- File or knowledge source handling: Good through LangChain tools, retrieval components, Deep Agents filesystem features, and app-defined resources.
- Sandboxing model: Application-provided through Deep Agents, containers, or external sandboxes when file or code execution isolation is needed.
- Extensibility: High. Low-level graph primitives, LangChain integrations, Deep Agents, LangSmith, templates, Studio, and platform APIs provide many composition options.
- Open-source viability: MIT-licensed TypeScript package backed by the LangChain ecosystem.
- Commercial cloud path: Strong for advanced orchestration, long-running processes, and enterprise-style operational controls.
- Risks and constraints: Lower-level primitives increase architecture work. Agentis must choose self-hosted versus platform deployment, design Slack and custom UI, and add sandboxing for coding agents.
- Evidence links:
  - [LangGraph.js GitHub](https://github.com/langchain-ai/langgraphjs)
  - [LangGraph overview](https://docs.langchain.com/oss/javascript/langgraph)
  - [LangGraph.js README](https://github.com/langchain-ai/langgraphjs/blob/main/README.md)

### CopilotKit

- Likely Agentis role: Frontend agent UX layer for chat, generative UI, shared app state, in-app actions, and human-in-the-loop control surfaces.
- Fit with existing Vite/shadcn web app: Excellent for a React app because CopilotKit provides hooks, components, headless UI options, and TypeScript support.
- Agent runtime fit: Medium as the primary backend runtime. Strongest role is connecting product UI to backend agents through AG-UI, state sync, actions, and generative UI.
- Slack integration: Build Slack handling in the Agentis backend. CopilotKit primarily improves the in-app web interaction model.
- Custom web chat integration: Excellent. It provides React chat UI, streaming, tool calls, agent responses, state sync, generative UI, and human-in-the-loop interactions.
- Deployment model: Frontend packages, app integration CLI, Copilot Cloud option, and AG-UI protocol for connecting to agent backends.
- Persistence and session model: Shared state and session UX are frontend strengths. Durable backend persistence belongs in the connected agent backend.
- File or knowledge source handling: Strong for UI state, app context, actions, and tool-rendered UI. Knowledge retrieval belongs in backend agent tools.
- Sandboxing model: Application-provided through the connected backend agent and its tools.
- Extensibility: High for frontend experience through hooks, components, AG-UI, in-app actions, shared state, generative UI, inspector, and headless mode.
- Open-source viability: MIT-licensed open-source core with premium team features.
- Commercial cloud path: Strong for polished commercial web UX when paired with a backend runtime such as Flue, Mastra, LangGraph, pi, or AI SDK.
- Risks and constraints: Agentis still needs to choose the backend runtime, persistence, Slack routing, sandboxing, and deployment model.
- Evidence links:
  - [CopilotKit README](https://github.com/CopilotKit/CopilotKit/blob/main/README.md)
  - [CopilotKit framework](https://www.copilotkit.ai/product/framework)
  - [CopilotKit docs](https://docs.copilotkit.ai/)

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

- [x] Flue is evaluated.
- [x] pi is evaluated.
- [x] Vercel AI SDK is evaluated.
- [x] At least two additional related open-source alternatives are evaluated.
- [x] Every candidate uses the same criteria.
- [x] Every material claim includes an evidence link or hands-on note.
- [ ] The synthesis names strongest candidate paths for hands-on validation.
- [ ] The synthesis records unresolved questions and next checks.
