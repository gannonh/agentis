# Agent Stack Validation

## Scope

Milestone `M001`, slice `S002`.

This document records hands-on validation notes and route sketches for the strongest candidate path from the research matrix: Flue as the agent harness, with Agentis owning product routes, Slack app installation, web chat UI, persistence records, and deployment policy.

## T006: Slack Event Routing Path

### Finding

Flue can sit behind an Agentis-owned Slack Events API adapter. The lowest-friction path is to keep Slack verification, OAuth installation, bot token storage, event dedupe, and `chat.postMessage` calls in Agentis, then invoke a Flue HTTP agent through its generated `POST /agents/:name/:id` route.

### Route Sketch

```ts
type SlackEventEnvelope = {
  type: "url_verification" | "event_callback"
  challenge?: string
  team_id?: string
  event_id?: string
  event?: {
    type: string
    channel?: string
    user?: string
    text?: string
    ts?: string
    thread_ts?: string
    bot_id?: string
  }
}

app.post("/api/slack/events", async (c) => {
  const rawBody = await c.req.text()
  await verifySlackSignature(
    c.req.raw.headers,
    rawBody,
    env.SLACK_SIGNING_SECRET
  )

  const envelope = JSON.parse(rawBody) as SlackEventEnvelope

  if (envelope.type === "url_verification") {
    return new Response(envelope.challenge ?? "", {
      headers: { "content-type": "text/plain" },
    })
  }

  if (envelope.type !== "event_callback" || !envelope.event) {
    return c.json({ ok: true })
  }

  if (await alreadyHandled(envelope.event_id)) {
    return c.json({ ok: true })
  }

  const event = envelope.event

  if (event.bot_id || event.type !== "message" || !event.channel || !event.ts) {
    return c.json({ ok: true })
  }

  const threadTs = event.thread_ts ?? event.ts
  const agentId = `slack:${envelope.team_id}:${event.channel}:${threadTs}`

  const agentResponse = await fetch(
    `${env.FLUE_ORIGIN}/agents/support/${encodeURIComponent(agentId)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        message: event.text,
        source: "slack",
        slack: {
          teamId: envelope.team_id,
          channelId: event.channel,
          userId: event.user,
          eventTs: event.ts,
          threadTs,
        },
      }),
    }
  ).then(
    (response) =>
      response.json() as Promise<{ text?: string; blocks?: unknown[] }>
  )

  await postSlackMessage({
    token: await botTokenForTeam(envelope.team_id),
    channel: event.channel,
    thread_ts: threadTs,
    text: agentResponse.text ?? "I could not produce a response.",
    blocks: agentResponse.blocks,
  })

  return c.json({ ok: true })
})
```

### Validation Notes

- Slack sends `url_verification` during Events API setup and expects the app to validate the request origin, then return the `challenge` value.
- Slack event callbacks arrive as JSON envelopes with an outer `event_callback` type and an inner `event` object. The adapter can dedupe with `event_id` before calling Flue.
- Slack replies belong in the originating channel and thread by posting with `channel` and `thread_ts`.
- Flue HTTP agents expose `POST /agents/<agent-name>/<id>`. Reusing a stable ID preserves the session scope for that Slack thread.
- Slack signing secrets and bot tokens belong in Agentis trusted server configuration. The Flue agent receives only normalized message content and Slack metadata needed for context.

### Evidence

- [Slack URL verification](https://docs.slack.dev/reference/events/url_verification)
- [Slack Events API](https://docs.slack.dev/apis/events-api/)
- [Slack `chat.postMessage`](https://docs.slack.dev/reference/methods/chat.postMessage)
- [Flue README, agents and sessions](https://github.com/withastro/flue/blob/main/README.md#agents-and-sessions)
- [Flue Node deployment, HTTP route shape](https://github.com/withastro/flue/blob/main/docs/deploy-node.md)

## T007: Flue Support-Agent Knowledge Access

### Finding

Flue's support-agent pattern fits Agentis docs or sample knowledge content when knowledge is exposed as files inside the agent sandbox. On Cloudflare, the clean path is an R2-backed virtual sandbox mounted with `getVirtualSandbox(env.KNOWLEDGE_BASE)`. For Node/local validation, the same agent shape can use a virtual sandbox populated with `session.shell()` or `sandbox: "local"` inside a trusted isolation boundary.

### Source Files For Agentis Seed Content

- `docs/prompts.md`
- `docs/research/agent-stack-matrix.md`
- Future product docs under `docs/knowledge/**/*.md`

### Cloudflare/R2 Agent Sketch

```ts
import { getVirtualSandbox } from "@flue/sdk/cloudflare"
import type { FlueContext } from "@flue/sdk/client"

export const triggers = { webhook: true }

export default async function ({ init, payload, env }: FlueContext) {
  const sandbox = await getVirtualSandbox(env.KNOWLEDGE_BASE)
  const agent = await init({
    sandbox,
    model: "anthropic/claude-sonnet-4-6",
  })

  const session = await agent.session()

  return session.prompt(
    `Search the mounted knowledge base with grep, glob, and read.
Answer from the relevant files and cite each file path.

Customer question: ${payload.message}`,
    { role: "support" }
  )
}
```

### Local Probe Sketch

```ts
import type { FlueContext } from "@flue/sdk/client"

export const triggers = { webhook: true }

export default async function ({ init, payload }: FlueContext) {
  const agent = await init({
    sandbox: "local",
    model: "anthropic/claude-sonnet-4-6",
  })
  const session = await agent.session()

  return session.prompt(
    `Use docs/prompts.md and docs/research/agent-stack-matrix.md to answer this Agentis support question.
Question: ${payload.message}`
  )
}
```

### Validation Notes

- Flue documents a support-agent pattern where R2 is mounted as the sandbox filesystem and the agent searches it with built-in `grep`, `glob`, and `read` tools.
- Cloudflare deployment gives this path durable session state through Durable Objects and durable knowledge files through R2.
- Node/local validation can populate a virtual sandbox with `session.shell()` for small inline files. For direct reads from checked-in Agentis docs, use `sandbox: "local"` inside a trusted CI runner, container, or VM.
- The Agentis support-agent prototype now has a local proof path for GUI-selected documentation: the web app sends selected knowledge-source IDs with display metadata and local documentation context references, then `resolveSupportAgentDocumentationContext` produces prompt-ready context for the support-agent runtime.
- The Flue-ready adapter input includes selected source IDs, source metadata, and resolved documentation context while keeping the public `SupportAgentRuntime` contract owned by Agentis.
- The recommended next Flue knowledge-access proof is a live Cloudflare Worker support-agent request that reads the same selected documentation set from an R2-backed virtual sandbox.
- Provider-native file/search APIs, RAG, and hybrid retrieval remain comparison paths after the R2-backed Flue route has request/response evidence.
- Live answer generation was not run in this task because no model API key, R2 bucket, or Slack install is configured in the repository. The local proof path is enough to validate GUI-to-runtime context mapping.

### Evidence

- [Flue Cloudflare support-agent pattern](https://github.com/withastro/flue/blob/main/docs/deploy-cloudflare.md#r2-backed-agents)
- [Flue README support-agent example](https://github.com/withastro/flue/blob/main/README.md#support-agent)
- [Flue Node sandbox context](https://github.com/withastro/flue/blob/main/docs/deploy-node.md#sandbox-context)
- [Flue Node local sandbox](https://github.com/withastro/flue/blob/main/docs/deploy-node.md#using-the-local-sandbox)
- `npm view @flue/sdk`: latest `0.4.1`, Apache-2.0

## T008: Flue Web Chat HTTP And Session Contract

### Finding

Flue gives Agentis a workable custom web chat contract through generated HTTP agent routes and stable agent IDs. The Vite/shadcn app should call an Agentis backend route, and that route should proxy to Flue so browser clients never receive model keys, Slack tokens, or deployment secrets.

### Contract Shape

| Concern                | Validated Shape                                                                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Flue endpoint          | `POST /agents/<agent-name>/<id>`                                                                                                    |
| Agent name             | File-derived route, such as `.flue/agents/support.ts` -> `/agents/support/:id`                                                      |
| Agent ID               | Stable runtime scope, such as `user:<userId>:agent:<agentId>`                                                                       |
| Conversation ID        | Use the Flue agent ID for the default conversation, or pass a thread identifier inside the agent and call `agent.session(threadId)` |
| Resume behavior        | Reuse the same agent ID, and the same optional session/thread ID when used                                                          |
| Cloudflare persistence | Durable Objects back session state for Cloudflare builds                                                                            |
| Node persistence       | In-memory by default; pass `persist` to `init()` for durable storage                                                                |
| Response behavior      | Documented examples return JSON from the agent handler; streaming needs a runnable check or adapter design                          |
| Error handling         | Agentis should normalize Flue/network errors into app-level chat error states and store retry metadata                              |

### Vite/Shadcn Integration Sketch

```ts
type AgentisChatRequest = {
  agentId: string
  conversationId: string
  message: string
}

export async function sendAgentisChatMessage(input: AgentisChatRequest) {
  const response = await fetch("/api/agentis/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw new Error(`Agent request failed: ${response.status}`)
  }

  return response.json() as Promise<{
    conversationId: string
    messageId: string
    text: string
    sources?: Array<{ title: string; path: string }>
  }>
}
```

### Backend Proxy Sketch

```ts
app.post("/api/agentis/chat", async (c) => {
  const user = await requireUser(c)
  const body = (await c.req.json()) as AgentisChatRequest

  const flueAgentId = `user:${user.id}:agent:${body.agentId}`
  const flueResponse = await fetch(
    `${env.FLUE_ORIGIN}/agents/support/${encodeURIComponent(flueAgentId)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        message: body.message,
        source: "web",
        conversationId: body.conversationId,
        userId: user.id,
      }),
    }
  )

  if (!flueResponse.ok) {
    return c.json(
      {
        error: "agent_request_failed",
        status: flueResponse.status,
      },
      502
    )
  }

  const data = await flueResponse.json()

  return c.json({
    conversationId: body.conversationId,
    messageId: crypto.randomUUID(),
    text: data.text ?? data.response ?? String(data),
    sources: data.sources ?? [],
  })
})
```

### Validation Notes

- The frontend should treat `conversationId` as Agentis product state and the Flue agent ID as backend runtime state. This keeps Agentis free to change runtime mapping later.
- For one conversation per deployed support agent, the backend can use a stable Flue agent ID and the default `agent.session()`.
- For multiple conversations under one runtime scope, the Flue agent can call `agent.session(threadId)` using the Agentis `conversationId`.
- Cloudflare deployment is the strongest session-resume path because Durable Objects persist Flue session state across requests.
- Node deployment requires a `SessionStore` through `persist` before Agentis can promise resume after process restart.
- Flue docs show JSON request/response examples. Streaming UX should be handled by an Agentis adapter after a live Flue prototype confirms whether direct streaming is available in the chosen runtime.

### Evidence

- [Flue README, agents and sessions](https://github.com/withastro/flue/blob/main/README.md#agents-and-sessions)
- [Flue Node deployment, routes and session store](https://github.com/withastro/flue/blob/main/docs/deploy-node.md)
- [Flue Cloudflare deployment, session persistence](https://github.com/withastro/flue/blob/main/docs/deploy-cloudflare.md#session-persistence)
- [Flue Render deployment, health and agent request examples](https://github.com/withastro/flue/blob/main/docs/deploy-render.md)

## T009: Sandbox And Deployment Options

### Finding

Use a staged Flue deployment path: virtual sandbox plus R2 for support-agent knowledge access, Cloudflare container sandbox for hosted coding-agent sessions that need Linux tools, and Daytona or another remote sandbox connector as the portability fallback. Node/Render is useful for early demos, but it needs an external store and an isolation boundary before commercial hosted agents use it.

### Comparison

| Option                             | Isolation                                                                                                | Startup Complexity                                                                                        | Secret Handling                                    | File Access                                                    | Cost Signals                                                                                      | Commercial Hosting Fit                                                   |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Flue virtual sandbox on Cloudflare | Filesystem abstraction, no full Linux container                                                          | Low for prompt, support, and retrieval agents                                                             | Worker secrets and bindings                        | R2-backed filesystem and built-in file tools                   | Workers, Durable Objects, and R2 usage                                                            | Best first path for support agents and web chat                          |
| Flue `sandbox: "local"`            | Host-level access                                                                                        | Low locally, high risk in hosted use                                                                      | Host process environment                           | Full project filesystem                                        | Host/runtime cost only                                                                            | Good for trusted CI, local prototypes, or inside a separate container/VM |
| Cloudflare container sandbox       | Per-session isolated container with persistent filesystem and Linux userspace                            | Medium: install `@cloudflare/sandbox`, configure Durable Object binding, migration, image, and Dockerfile | Worker secrets plus container environment controls | Full Linux workspace, git, node, curl, and writable filesystem | Containers bill active vCPU/memory/disk time and egress, with Workers/Durable Objects also billed | Best Flue-native path for hosted coding agents                           |
| Daytona remote sandbox             | External sandbox with isolated filesystem, network stack, allocated CPU/RAM/disk, snapshots, SDK/API/CLI | Medium: provider account, API key, connector integration, lifecycle cleanup                               | Daytona API key in Agentis server config           | Sandbox filesystem, process execution, git, terminal, previews | Provider pricing and quota model                                                                  | Strong portability fallback for full agent computers                     |
| Pi in a container or microVM       | Depends on selected container/VM/microVM provider                                                        | High: Agentis owns image, session runner, logs, persistence, and cleanup                                  | Agentis-owned secrets and provider credentials     | Full repo/workspace file access                                | Provider compute, storage, and egress                                                             | Defer for advanced coding-agent workers after Flue path is validated     |

### Recommendation For Architecture Decision

- Start commercial support-agent validation on Flue Cloudflare Workers with R2-backed knowledge and Durable Object-backed sessions.
- Use Cloudflare container sandbox for coding-agent capabilities when the agent needs package installs, git, browser tools, or full Linux execution.
- Keep Daytona as the first remote sandbox fallback because it provides SDK/API/CLI access, snapshots, filesystem operations, process execution, and isolation as a dedicated sandbox product.
- Use Node/Render only for demos or trusted internal deployments until Agentis adds persistent session storage and external sandbox isolation.
- Defer pi-in-container until Agentis specifically needs pi's coding-agent runtime or TUI/harness ecosystem behind a product wrapper.

### Unresolved Risks

- Confirm Cloudflare container cold start behavior and cost under realistic Agentis coding-agent session lengths.
- Decide tenant-level sandbox identity, retention, cleanup, and quota policy.
- Decide whether knowledge files live in R2, app database exports, repository sync, or per-agent object storage.
- Define secret injection boundaries for model keys, Slack bot tokens, customer integrations, and sandbox-scoped credentials.
- Run one live remote sandbox task before committing to Cloudflare containers or Daytona.

### Evidence

- [Flue Cloudflare remote sandbox docs](https://github.com/withastro/flue/blob/main/docs/deploy-cloudflare.md#connecting-a-remote-sandbox)
- [Flue Node local sandbox docs](https://github.com/withastro/flue/blob/main/docs/deploy-node.md#using-the-local-sandbox)
- [Flue Render deployment notes](https://github.com/withastro/flue/blob/main/docs/deploy-render.md)
- [Cloudflare Containers pricing](https://developers.cloudflare.com/containers/pricing/)
- [Daytona docs](https://www.daytona.io/docs/)

## T010: S002 Decision Input

### Viability Statement

Flue remains viable as the strongest initial backend candidate for Agentis. It covers the support-agent and web-chat paths with HTTP agents, stable runtime IDs, R2-backed knowledge, Durable Object-backed sessions on Cloudflare, and a route to full Linux sandboxes through Cloudflare containers or remote sandbox connectors.

### Validated Fit

| Area                     | Finding                                                                                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Agent configuration      | `.flue/agents` and `.flue/roles` can hold Agentis runtime code separately from the Vite/shadcn app while sharing repository context.                    |
| Deployable runtime       | Cloudflare Workers is the strongest first deployment target because it combines HTTP agents, Durable Objects, R2, and container sandboxes.              |
| Slack path               | Agentis should own Slack installation, signature verification, event dedupe, channel/thread mapping, and response posting, then call a Flue HTTP agent. |
| Web chat path            | The Vite/shadcn app should call an Agentis backend route that maps users, agents, and conversations onto Flue agent IDs and sessions.                   |
| Persistence and sessions | Cloudflare deployment supports durable session state. Node deployment needs a custom `persist` store before production use.                             |
| Knowledge sources        | R2-backed files are the strongest first path for support docs. Local sandbox reads are useful for trusted prototypes.                                   |
| Sandboxing               | Virtual sandbox fits support/retrieval agents. Cloudflare container sandbox or Daytona fits hosted coding agents.                                       |
| Commercial hosting       | Flue on Cloudflare is a coherent first hosted architecture, with cost and cold-start checks still needed for container-heavy workloads.                 |

### Architecture Recommendation Inputs

- Choose Flue-on-Cloudflare as the default architecture candidate for the next slice.
- Define the Agentis-owned data model for users, agents, conversations, Slack installs, knowledge sources, deployment state, and sandbox runs.
- Keep Vercel AI SDK UI available for chat UI state and message rendering in the Vite/shadcn app.
- Keep Mastra as the backend comparison candidate if architecture planning prioritizes built-in channels, memory, observability, and workflow features.
- Keep Daytona as the remote sandbox fallback for coding-agent sessions that exceed Cloudflare container constraints.

### Decisions Needed In Planned Slice 3

- Cloudflare-first deployment or Node-first deployment for the first product milestone.
- Agentis session schema: how product conversations map to Flue agent IDs, optional Flue session IDs, Slack thread IDs, and web chat IDs.
- Persistence owner: which state lives in Agentis storage, Flue Durable Objects, R2, Slack install tables, and sandbox provider state.
- Knowledge lifecycle: upload, indexing/search expectations, per-agent access boundaries, retention, and audit trail.
- Sandbox lifecycle: per-user or per-conversation identity, startup policy, retention, cleanup, logs, quotas, and secrets boundary.
- UI stack: AI SDK UI alone or AI SDK UI plus CopilotKit for richer in-app actions and human approval controls.

### Carry-Forward Checks

- Run a live Flue Cloudflare support-agent request against a small R2-backed knowledge base.
- Run one web chat request through an Agentis backend proxy into a Flue HTTP agent and record the exact response envelope.
- Run Slack URL verification and one message event through a local or staging adapter.
- Run one Cloudflare container sandbox or Daytona command with realistic package install and file output behavior.
- Compare a narrow Mastra endpoint if Flue validation blocks on sessions, Slack channel support, memory, observability, or deployment ergonomics.
