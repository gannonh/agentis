# Replacement provider feasibility

Selected after the pre-adapter live feasibility gate passed; full product acceptance is still pending. Claude Agent SDK `0.3.263`, model `claude-sonnet-5`, effort `medium`. Anthropic API billing requires a scoped funded `ANTHROPIC_API_KEY`; Claude subscription authentication is excluded. Gannon owns provider selection/support. No product adapter changes are included.

Build the disposable Linux candidate image without inference:

```sh
node docs/verification/kat-3243/replacement-provider/run.mjs --build
```

After supplying the scoped key in the invoking process environment, run:

```sh
node docs/verification/kat-3243/replacement-provider/run.mjs
```

A missing key stops before inference. The runner imports the key through stdin into a private temporary Docker volume and deletes the volume afterward. It uses the existing per-run container/network helpers: nonroot UID10001, readonly root, isolated internal network, proxy allowing only `api.anthropic.com`, scratch workspace, no owner mounts. Three queries are bounded to 90 seconds, four turns and $1 each; the outer process terminates at 300 seconds.

The question cases require an actual native `AskUserQuestion` callback, hold it for 1.5 seconds without a tool result or final response, then answer or cancel. The draft query exposes zero tools and must return the exact marker. Native init must report the exact model and API-key source; its tool inventory must contain only `AskUserQuestion` for input and no tools for draft. This proves structural exclusion only if observed live. No callback is called directly by this harness; an ordinary text question fails.

Sanitized per-run receipts live under `runs/`. Missing auth, missing native callback, inventory mismatch or provider failure is FAIL, never support evidence. Current status: live feasibility PASS on September 7, 2026. [Receipt](runs/claude-feasibility-26af3cd8-d801-4765-ba34-de51b99437ba/receipt.json): native question held 1,505 ms then BLUE; pending question canceled with native child terminated; native draft tools=[] and exact KAT3243_DRAFT. Independent review confirmed the gate. This authorizes adapter implementation, not product support or merge. The earlier preflight.json remains historical evidence of missing authentication before provisioning.

Primary references: [SDK user input](https://code.claude.com/docs/en/agent-sdk/user-input), [SDK permissions](https://code.claude.com/docs/en/agent-sdk/permissions).
