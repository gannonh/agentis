# Run the disposable boundary probes

Run from the repository root with Python 3. No dependency installation or production runtime is involved. The probes create synthetic credentials, temporary SQLite databases, child processes, and loopback HTTP endpoints. They never open the user's real credential stores or call a real administrative API. Chromium, when available, uses a generated profile and retains its sandbox. No provider login or inference occurs.

```sh
python3 docs/research/execution-boundaries/probes/probe.py > /tmp/kat-3252-host.json
python3 docs/research/execution-boundaries/probes/container_probe.py > /tmp/kat-3252-container.json
git diff --check
```

The host probe needs permission to create local sockets and run child processes. A sandbox denial records UNVERIFIED. Run it in an authorized host shell to exercise HTTP/browser/crash cases. The first probe expects same-user credential access to succeed. Its PASS means the counterexample reproduced, not that owner isolation passed.

To exercise the offline container candidate on a supported Mac, supply an already local, reviewed Python image by immutable digest:

```sh
python3 docs/research/execution-boundaries/probes/container_probe.py --image "$reviewed_python_image_digest" > /tmp/kat-3252-macos-container.json
```

Set `reviewed_python_image_digest` to the full image reference, including `@sha256:` and its digest. The probe never pulls an image, changes Docker configuration, mounts owner data, or falls back to host execution. It deletes only its randomly named disposable container and temporary files. A successful offline result still does not prove the online provider/proxy configuration or native harness behavior.

Read each case's expected and observed values. Review the global verdict and every UNVERIFIED row; exit code zero includes UNVERIFIED because an unavailable environment is research evidence, not a successful boundary test. Unexpected counterexample/check results return nonzero. Execution errors remain errors, not converted successes.

## Captured run

The committed host run used Python 3.14.7 and Chromium 151.0.7922.173 on Linux 7.1.9-arch1-2 x86_64. The JSON records the complete platform string, source commit, and SHA-256 of the exact probe file. The source commit identifies the containing research source; it is not an integrated Agentis runtime SHA.

| Artifact | Invocation environment | Observation |
| --- | --- | --- |
| [sandbox.json](../evidence/sandbox.json) | Coding session workspace sandbox | Synthetic file/config access reproduced; socket creation denied, so HTTP/browser/crash checks unavailable |
| [host.json](../evidence/host.json) | Same Linux user outside the coding session sandbox, explicitly authorized disposable probe | Credential, synthetic stdio, browser-session and forced-kill counterexamples reproduced |
| [container.json](../evidence/container.json) | Same Linux host user outside session sandbox | Docker Engine unavailable to this user; no image or container executed |

The host synthetic administrative endpoint deliberately accepts possession of its generated owner token or cookie. It is not a secure server implementation and does not claim Host/Origin/CSRF validation. Its unauthenticated and synthetic bot-token requests received 401; a child holding the synthetic owner credential received 200. The generated stdio child exchanges JSON-RPC-shaped initialize/tool messages solely to test process authority. It is not an MCP conformance test or a live provider's native MCP path.

The browser receives a synthetic HttpOnly owner cookie on the probe page, then JavaScript calls the same-origin administrative endpoint. This proves the risk of giving a bot an owner-authenticated browser context. It does not claim theft of HttpOnly cookie bytes, a cross-origin attack, or a tested provider browser tool.

The crash worker commits local state and calls a distinct append ledger served by the surviving probe parent. The parent waits for a named checkpoint, sends SIGKILL, reads the worker's SQLite state, and independently counts external ledger rows. It observes the surviving child and then kills only that worker's process group. `external_accepted` occurs after the HTTP response but before receipt persistence. The separate acceptance-before-response window is explicitly UNVERIFIED in the matrix.

No automatic recovery loop runs in this probe. The zero-versus-one effect observation demonstrates why local dispatch state is insufficient; it does not test production reconciliation or exactly-once effects. The synthetic approval state is written directly for crash injection and does not exercise authentication, approval binding, expiry, races, or cancellation enforcement.
