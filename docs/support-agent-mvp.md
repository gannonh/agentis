# Support-Agent MVP Run Notes

## Local Commands

Install dependencies:

```bash
pnpm install
```

Start the web app:

```bash
pnpm dev
```

Start the web app for the Codex in-app browser:

```bash
pnpm dev -- -- --host 127.0.0.1
```

Run focused support-agent UI and contract checks:

```bash
pnpm --filter web test -- App.test.tsx
pnpm --filter web test -- src/lib/support-agent
pnpm --filter web typecheck
```

Run the repository checks:

```bash
pnpm lint
pnpm test
pnpm typecheck
pnpm test:e2e
pnpm ci
```

## Template Flow

1. Open the Vite local URL printed by `pnpm dev`.
2. Confirm the page heading is `Configure a support agent`.
3. Edit `Template name` and confirm the `Template preview` heading updates.
4. Select `Product documentation sample`.
5. Confirm the preview shows `Selected source: Product documentation sample`.

## Chat Path

1. Select `Product documentation sample`.
2. Enter a question in `Support question`, such as `How do I connect a knowledge source?`.
3. Choose `Ask support agent`.
4. Confirm the transcript shows the submitted `User` message.
5. Confirm the `Assistant` answer appears with source metadata:
   - `Source: Product documentation sample`
   - `Source ID: source_product_docs_setup`
   - `Select Product documentation sample during setup.`

## Current Runtime Boundary

The local MVP uses the Agentis-owned support-agent contract in `apps/web/src/lib/support-agent` and a deterministic local responder. The Flue adapter boundary remains available for the configured runtime path.

## Acceptance Handoff

See `docs/research/support-agent-mvp-acceptance.md` for MVP acceptance evidence and follow-up boundaries.
