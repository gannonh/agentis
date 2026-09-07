# Native provider container setup

KAT-3243 provisions the existing Codex provider for the Docker Desktop Run-container boundary on macOS. Start Docker Desktop, install the workspace dependencies, and build the CLI:

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm agentis provider provision --data-root "$HOME/.agentis/v2"
pnpm agentis provider login --data-root "$HOME/.agentis/v2"
```

The login command runs Codex's native device authorization flow. Follow its displayed URL and code in your browser. Enable device authorization in your ChatGPT security settings if the provider requests it. Agentis does not read the host's Codex credentials. Use the same absolute data root for provisioning, login, and serving.

```sh
pnpm agentis serve --endpoint http://127.0.0.1:43129 --data-root "$HOME/.agentis/v2" --provider codex
```

In another terminal, submit a scratch task:

```sh
pnpm agentis task submit --endpoint http://127.0.0.1:43129 --data-root "$HOME/.agentis/v2" --brief 'Reply exactly CODEX_CONTAINER_OK. Do not call tools.'
pnpm agentis doctor --endpoint http://127.0.0.1:43129 --data-root "$HOME/.agentis/v2"
```

The daemon retains its explicit endpoint and owner authentication. Docker failure fails the Run; this path never launches the host Codex executable.

## Image and credentials

Provisioning generates a temporary Docker build context containing only a Dockerfile and Squid configuration. It does not send the repository or `.env` to Docker. The local image is `agentis-codex:0.153.4`: Codex npm package 0.153.4, Squid 5.7-2+deb12u6, and Node 24.20.0 Bookworm slim at index digest `sha256:ba849c60be29959425b8734d57b8b4b7d56f98edd9504c9af091d5281095a71e`. Debian certificate and Git packages are resolved at build time. Package availability is a provisioning prerequisite; there is no version fallback.

Codex owns its native file credential store in a dedicated Docker volume named from a hash of the absolute data root. The login container mounts only that volume. Each Run mounts it read-only and copies only `auth.json` into its own durable provider home volume. Each Run has a distinct `agentis-provider-state-RUN_ID` volume mounted at `/provider-home`; sessions and configuration are never shared between bots or Runs. Token refresh writes stay in that Run volume and are not propagated to the shared login volume. Repeat native login if the saved credential expires or becomes invalid.

Provider credentials are readable by same-user native tools inside the container, as accepted in ADR 0001. They are not owner credentials. Neither `owner.token`, the Agentis database, host Codex configuration, Docker sockets, nor host browser profiles are mounted. The workspace mount contains that Run's scratch directory only; Codex receives `/workspace` as its working directory.

## Network and cleanup

Each Run has its own internal Docker network and Squid sidecar. The network explicitly disables IPv6 and sets `com.docker.network.bridge.gateway_mode_ipv4=isolated`. Docker documents that an internal network alone retains a bridge address through which host services can be reached; [isolated gateway mode removes that address](https://docs.docker.com/engine/network/port-publishing/#gateway-modes). Docker must support this option; creation fails without a fallback if it cannot. Only the sidecar connects to the external bridge. No ports are published. The Run uses the sidecar through explicit proxy environment variables. Squid permits HTTPS CONNECT on port 443 only to the exact names `auth.openai.com` and `chatgpt.com`; private and special-use destination addresses are denied before access is allowed. Arbitrary destinations and non-CONNECT requests are denied. Model shell commands cannot add provider destinations through configuration.

Containers run as UID/GID 10001 with a read-only root, dropped capabilities, no privilege gain, and CPU, memory, PID, and tmpfs limits. Login removes its sidecar and network on return. Terminal Run cleanup and daemon restart cleanup remove owned Run containers, proxy sidecars, and networks. Ownership labels are checked before removal. Provider credential and Run state volumes remain for later Runs and explicit history loading. A forcibly interrupted login may require removing its labeled login resources before retrying.

Tests using the Docker fixture establish command wiring and cleanup behavior only. Live authentication, provider calls, and host/LAN isolation need separate recorded evidence in the KAT-3243 verification artifacts. This prerequisite does not establish second-provider or handoff acceptance.


## Cursor local provisioning

Cursor is installed locally from the user's official Linux arm64 archive. Agentis does not distribute the proprietary binary or publish the resulting image. This pin supports Linux arm64 only: `2026.09.02-c22c1a3`, SHA256 `fb7bc635be6172ebcf68f907fd9217e3614da51916455c6d7fdb66690997884c`. Provisioning rejects a different archive hash and builds with `--platform linux/arm64`.

```sh
pnpm agentis provider provision --provider cursor --package /absolute/path/cursor-linux-arm64.tar.gz --data-root "$HOME/.agentis/v2"
pnpm agentis provider import-key --provider cursor --key-file /absolute/path/private-key-file --data-root "$HOME/.agentis/v2"
```

The key file must grant no group or other permissions. Omit `--key-file` to read one key from stdin. Import writes the key directly into a dedicated `agentis-cursor-auth-*` Docker volume. The key is not passed on the command line, stored in the image, or read automatically from `.env`. Each Run reads it inside the container into the native `CURSOR_API_KEY` environment variable. The temporary build context contains only the verified archive, Dockerfile, and Squid configuration.

Cursor uses ACP protocol 1 through `@agentclientprotocol/sdk` 1.4.0. Its proxy permits exactly `api2.cursor.sh` and `agentn.global.api5.cursor.sh`, as required by the selected provider connection. The image uses the same pinned base, Squid version, resource limits, and destination-address checks as Codex. Update and package-registry destinations remain denied. No host Cursor execution is available.

## Fixed bots and public state

A live daemon exposes Mara (coordinator, Codex app-server) and Ivo (specialist, Cursor ACP). Select the bot explicitly; one active Run per bot and two globally are admitted. The fake provider remains an explicit verification fixture.

```sh
pnpm agentis task submit --endpoint http://127.0.0.1:43129 --data-root "$HOME/.agentis/v2" --bot ivo --brief 'Write a short draft. Do not call tools.'
pnpm agentis task submit --endpoint http://127.0.0.1:43129 --data-root "$HOME/.agentis/v2" --bot mara --mode plan --brief 'Ask a structured question before drafting.'
pnpm agentis session load --endpoint http://127.0.0.1:43129 --data-root "$HOME/.agentis/v2" --run RUN_ID
```

The frozen Run configuration records bot identity, provider, native transport, executable version, model, auth mode, mode, workspace and limits. Cursor's selected model is `gpt-5.6-sol[context=272k,reasoning=medium,fast=false]`; session creation must advertise that exact selector. Codex uses `gpt-5.6-sol` with medium effort. Tasks, Runs, local threads and provider sessions retain separate identities. The schema is `agentis.v2.gate0.3`; older databases are refused without migration.

Doctor includes each Run's provider state: provider-advertised capabilities with typed unavailable reasons and a separate Agentis operation availability field, complete pending question/plan payloads, ordered history, explicit session-load status, and classified failures. A documented extension does not imply live proof. Cursor questions and plans use their native blocking methods. Plain text questions remain ordinary output. Attachment and MCP configuration requests receive `unsupported-capability`; provider advertisement does not enable an unimplemented Agentis operation. Approval decisions and input answers route through the Run's frozen provider. Stop-all cancels both transports and latches future submissions.

Explicit session loading requires an inactive Run with a saved provider session. It creates no task, Run, draft or prompt turn. The scratch mount is read-only while loading. Cursor replays history for comparison, normalizing regenerated tool IDs and chunk boundaries; a mismatch records failure. Codex resumes with `excludeTurns: true` and pages `thread/turns/list`. Repeated loads replace the history view rather than appending duplicates. Provider session IDs remain unchanged.

Draft artifacts contain returned provider text. Empty completed responses and recognized provider error responses fail instead of manufacturing a successful draft. Protocol fixtures prove adapter behavior; live product acceptance, selected account billing and structured-question support retain their separate evidence in `docs/verification/kat-3243/` and `docs/research/provider-contracts/`.
