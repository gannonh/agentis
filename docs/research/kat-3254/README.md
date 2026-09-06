# Run the conversational team prototypes

[KAT-3254](https://linear.app/kata-sh/issue/KAT-3254) compares three disposable interfaces over one fictional release-readiness task. All agent behavior, account connections, artifacts, actions, and receipts are simulated. The prototypes use original HTML, CSS, JavaScript, and fictional source excerpts. They contain no production runtime or live integration.

Read the [comparison and selection](comparison.md), [measurement protocol](protocol.md), and [requirements for the next slices](adoption.md).

## Start the prototype

From the repository root, run this command with Python 3.

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory docs/research/kat-3254/prototypes
```

Open [A, shared team room](http://127.0.0.1:4173/?variant=A), [B, manager direct message](http://127.0.0.1:4173/?variant=B), or [C, task first](http://127.0.0.1:4173/?variant=C). Use the top switcher to compare them. Stop the server with Ctrl+C.

Use a separate browser profile for research. Each alternative stores its own fictional scenario in browser local storage under `kat3254-research-A`, `-B`, or `-C`. **Restart this simulated scenario** clears only that alternative's demonstration state. Refresh retains its current state. Unrecognized saved data is preserved and refused. This storage is disposable research data, not the Agentis data root.

The corrected onboarding flow uses research state version 2. Version 1 records are preserved and refused because they allowed task creation before setup. Use a fresh browser profile to run the corrected scenario.

## Walk through the same task

1. Choose **Use demonstration environment**, then **Allow this source read**. These separate the fictional provider/execution choice from authority to read sources for the first task. Setup starts no task.
2. In C, choose **Start a request**. A and B show the composer after setup.
3. Choose **Send request** to ask Mara for the supplied release brief. The first task starts in conversation after connection and source authority, without roster or workflow configuration. Only the supplied scenario text is accepted.
4. In the research controls below the workspace, choose **Simulate Mara offering handoff**. Mara still owns the task. Choose **Simulate Ivo accepting** to transfer ownership explicitly.
5. In C, open the linked conversation. Read Ivo's question and choose **Send reply** to limit the brief to release blockers.
6. Choose **Simulate Ivo delivering brief** in the research controls. Choose **Inspect release brief**, expand both source excerpts, and close the dialog.
7. Choose **Review exact action**. Inspect the account, destination, exact title/body, scope, duration, human approver, and attempt. Choose **Connect this demonstration destination**. That setup step permits requesting approval and grants no write.
8. Choose **Approve this exact action once**. The approval is recorded before a simulated effect or receipt exists.
9. Choose **Simulate completion receipt**, then **Inspect receipt**. The receipt identifies `action-1 v1`, `attempt-1`, `brief-v1`, and the fictional `SIM-LIN-104` issue. No real issue exists.

For the failure branch, restart and choose **Simulate handoff failure** after the offer. Mara retains ownership and no specialist starts. A deliberate new offer can be accepted.

For the unknown branch, choose **Simulate interruption before receipt** after approval. The brief remains inspectable while the action outcome stays unknown. Refresh and repeat the notification. Neither repeats the effect. **Simulate read-only receipt lookup** finds the existing receipt without another action.

Use Tab and Shift+Tab to move focus, Enter to activate, and Escape to close a dialog. The mobile layout uses the same controls. The exact-action dialog scrolls vertically on a narrow viewport.

## Reproduce the browser evidence

Keep the static server running. Install the pinned browser driver into an isolated temporary directory. These commands do not add application dependencies.

```sh
npm install --prefix /tmp/kat-3254-browser --cache /tmp/kat-3254-npm-cache --ignore-scripts --no-audit --no-fund playwright@1.58.2
EVIDENCE_DIR=/tmp/kat-3254-recheck node docs/research/kat-3254/verify.mjs
```

The recorded run used Chromium at `/usr/bin/chromium`. Set `CHROMIUM_PATH` for another installed Chromium binary. Set `PLAYWRIGHT_MODULE` to an absolute Playwright `index.mjs` path if installed elsewhere. `PROTOTYPE_URL` changes the explicit HTTP loopback origin and accepts no path. The driver uses fresh browser contexts, permits only that origin, and writes screenshots and `results.json` to `EVIDENCE_DIR`. It verifies every served prototype asset against the recorded source hash before the browser consumes it. A stale or different checkout fails even when its behavior passes the scenario assertions.

Run the source-attribution regressions with the same browser prerequisites. This command starts temporary loopback servers and prints the temporary evidence directory. It verifies rejection of altered HTML, CSS, both JavaScript modules, redirects, and a server that changes its HTML only on a later probe page.

```sh
node docs/research/kat-3254/verify-source-binding.mjs
```

Read [the captured record](evidence/results.json) for the exact tested SHA, file hashes, versions, interactions, timings, and individual checks. The [screenshot index](evidence/README.md) links every capture. The browser driver verifies simulated client behavior only. It does not implement `agentis verify launch` or prove provider/authentication/authorization/recovery/scheduling/business value.
