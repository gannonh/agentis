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
