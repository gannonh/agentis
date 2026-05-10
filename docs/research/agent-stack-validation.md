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
- The Agentis support-agent prototype can answer from `docs/prompts.md` and the research matrix once the files are mounted or copied into the sandbox.
- Live answer generation was not run in this task because no model API key, R2 bucket, or Slack install is configured in the repository. The inspected setup path is enough to proceed to architecture selection.

### Evidence

- [Flue Cloudflare support-agent pattern](https://github.com/withastro/flue/blob/main/docs/deploy-cloudflare.md#r2-backed-agents)
- [Flue README support-agent example](https://github.com/withastro/flue/blob/main/README.md#support-agent)
- [Flue Node sandbox context](https://github.com/withastro/flue/blob/main/docs/deploy-node.md#sandbox-context)
- [Flue Node local sandbox](https://github.com/withastro/flue/blob/main/docs/deploy-node.md#using-the-local-sandbox)
- `npm view @flue/sdk`: latest `0.4.1`, Apache-2.0
