# Self-host research golden path

Use this path to run Agentis locally with Cloudflare AI Gateway for model execution and Tavily keyless search for native web search. It does not require a Vercel AI Gateway key.

## Prerequisites

- Node.js 20 or newer
- pnpm 9.15.x
- A Cloudflare API token with AI Gateway access
- Your Cloudflare account ID

## 1. Clone and install

```bash
git clone https://github.com/gannonh/agentis.git
cd agentis
pnpm install
cp .env.example .env
cp apps/web/.env.example apps/web/.env
```

## 2. Configure live runtime env

Add these values to the repo root `.env`:

```bash
AI_GATEWAY_PROVIDER=cloudflare
CLOUDFLARE_API_KEY=your_cloudflare_api_token
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
CLOUDFLARE_AI_GATEWAY_ID=default

AGENTIS_WEB_SEARCH_PROVIDER=tavily
AGENTIS_WEB_SEARCH_BACKEND=keyless

AGENTIS_MOCK_RUNTIME=0
AGENTIS_MOCK_COMPOSIO=0
```

`CLOUDFLARE_AI_GATEWAY_ID` is optional when your account uses the default gateway id.

Do not put these secrets in `apps/web/.env`. The API loads the repo root `.env` on startup.

## 3. Start Agentis

```bash
pnpm dev
```

Open [http://localhost:5177](http://localhost:5177). The API runs on port 3101 unless `AGENTIS_API_PORT` is set.

Check runtime health:

```bash
curl -sf http://localhost:3101/api/health
curl -sf http://localhost:3101/api/runtime/health
```

`/api/runtime/health` should report `"available":true`, `"aiGatewayProvider":"cloudflare"`, and no `missingEnvVars`.

## 4. Create a research brief

1. Open `/threads/new`.
2. Choose the **Research a topic** quick action, or paste this prompt:

   ```text
   Research how small businesses are adopting AI agents in 2026. Search the web for current sources, then create a markdown research brief with inline citations.
   ```

3. Send the prompt and wait for the run to finish.
4. Open `/library`.
5. Confirm the new markdown research brief appears in the Library.
6. Open the document and confirm it includes inline citations or source links.

## Troubleshooting

### Runtime health shows missing env vars

Run:

```bash
curl -s http://localhost:3101/api/runtime/health | jq
```

Add the variables listed in `missingEnvVars` to the repo root `.env`, then restart `pnpm dev`.

### Web search is unavailable

Confirm the search env pair is set exactly:

```bash
AGENTIS_WEB_SEARCH_PROVIDER=tavily
AGENTIS_WEB_SEARCH_BACKEND=keyless
```

If `AGENTIS_WEB_SEARCH_PROVIDER=tavily` is paired with another backend, the API rejects startup because Tavily only supports `keyless` in this slice.

### Model picker does not show Cloudflare models

Confirm `AI_GATEWAY_PROVIDER=cloudflare`, restart `pnpm dev`, then check `/api/runtime/health`. The model catalog is selected from the configured gateway provider at API startup.

### The run uses mock output

Set `AGENTIS_MOCK_RUNTIME=0` and restart the API. Real UAT evidence requires mock runtime disabled.

### Composio says unavailable

This golden path does not require Composio. Keep `AGENTIS_MOCK_COMPOSIO=0` for real UAT. Add Composio credentials only when testing integration flows.
