---
type: UAT
title: Webhook agent invocation golden path
description: Manual verification steps for signed webhook delivery, worker execution, and Agent Detail source labels.
tags: [invocations, webhooks, uat, ha-gap-14]
timestamp: "2026-06-15T18:45:00Z"
---
# Webhook agent invocation UAT

## Prerequisites

- API, web, and invocation worker running (`pnpm dev` and `pnpm dev:worker`).
- Live or mock runtime configured for the verification target.
- `AGENTIS_API_PUBLIC_ORIGIN` set to the API base callers will use (defaults to `http://127.0.0.1:3101`).

## Signed curl example

Create a webhook from Agent Detail → Invocations → Webhooks, then copy the one-time secret and URL.

```bash
WEBHOOK_URL="http://127.0.0.1:3101/api/webhooks/agents/webhook_<id>"
WEBHOOK_SECRET="whsec_<secret-from-create-or-rotate>"
BODY='{"event":"uat_ping","message":"hello from curl"}'
TIMESTAMP="$(date +%s)"
SIGNATURE="$(printf '%s.%s' "$TIMESTAMP" "$BODY" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | sed 's/^.* //')"
SIGNATURE="sha256=${SIGNATURE}"

curl -i -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "x-agentis-webhook-timestamp: $TIMESTAMP" \
  -H "x-agentis-webhook-signature: $SIGNATURE" \
  -H "x-agentis-delivery-id: uat-$(date +%s)" \
  --data "$BODY"
```

Expected response: `202 Accepted` with `{ "deliveryId": "...", "status": "queued" }`.

## Verification checklist

1. Worker processes the queued delivery without browser streaming (`POST /api/runs/:runId/stream` is not required).
2. A thread and run are created for the agent.
3. Agent Detail → Activity shows `Webhook: <name>` on the recent thread.
4. Disabling the webhook returns `410` for new signed requests.
5. Invalid signatures return `401` and do not create delivery rows.
6. Empty POST bodies are accepted (`202`) and execute successfully after worker processing (stored payload is `{}`).
7. Oversized bodies return `413` (`webhook_payload_too_large`); stale timestamps return `400` with `stale_webhook_timestamp`.

## Where to confirm results

- Delivery status: Agent Detail → Invocations → Webhooks (last delivery status).
- Thread/run: link from the webhook card or `GET /api/agents/:agentId` recent threads.
- Run completion: thread session UI or `GET /api/threads/:threadId`.
