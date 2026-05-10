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

| Candidate | Likely Agentis Role                                       | Vite/shadcn Fit                                                                                                                                 | Agent Runtime Fit                                                                                                       | Slack Integration                                                                                                                        | Custom Web Chat                                                                                                                     | Deployment Model                                                                          | Persistence / Sessions                                                                                                                              | File / Knowledge Sources                                                                                                    | Sandboxing                                                                                                                                       | Extensibility                                                                                                                      | Open-Source Viability                                                                     | Commercial Cloud Path                                                                                                                                                                                                                  | Risks / Constraints                                                                                                                                           | Evidence                                                                                                                                                                                                                                                                                                                         |
| --------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Flue      | Primary agent harness and deployment framework candidate. | Can run as HTTP agents behind the existing web app or as a separate agent service. Flue source can live in `./.flue/agents` or root `./agents`. | Strong fit for autonomous agents with sessions, prompts, skills, roles, typed schemas, tasks, shell, and runtime tools. | HTTP webhook endpoints can receive Slack app events, but Slack-specific event handling, auth, and response formatting need Agentis code. | Strong fit because webhook agents expose `/agents/<name>/<id>` endpoints for chat sessions; Agentis can call them from the web app. | Supports Node.js servers, Cloudflare Workers, CLI/CI runs, and remote sandbox connectors. | Cloudflare target persists session state with Durable Objects. Node.js target uses in-memory sessions by default unless a custom store is supplied. | Supports inline setup files, R2-backed virtual filesystems, AGENTS.md, skills, shell tools, and remote sandbox filesystems. | Defaults to fast virtual sandbox. Also supports local host sandbox, Cloudflare container sandbox, and remote sandbox connectors such as Daytona. | High: TypeScript SDK, roles, skills, structured schemas, MCP tool adapter, connector pattern, custom tools, and session/task APIs. | Apache-2.0 TypeScript project from withastro, but marked experimental with changing APIs. | Strong Cloudflare path through Workers, R2, Durable Objects, and containers; Node path runs on VPS, Docker, Railway, Fly.io, or cloud platforms. Multi-tenant SaaS boundaries need design around sandbox choice, secrets, and storage. | API churn, Slack adapter work, custom app persistence on Node, sandbox security decisions, and product UI/orchestration work remain Agentis responsibilities. | [README](https://github.com/withastro/flue/blob/main/README.md), [Cloudflare deployment](https://github.com/withastro/flue/blob/main/docs/deploy-cloudflare.md), [Node deployment](https://github.com/withastro/flue/blob/main/docs/deploy-node.md), [package license](https://github.com/withastro/flue/blob/main/package.json) |

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
