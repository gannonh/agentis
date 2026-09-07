# Codex container setup

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

Codex owns its native file credential store in a dedicated Docker volume named from a hash of the absolute data root. The login container mounts only that volume. Each Run mounts it read-only and copies only `auth.json` into its own tmpfs Codex home. Run sessions, configuration, and token refresh writes disappear with that Run. This slice does not provide durable provider-session resume or refreshed-token propagation. Repeat native login if the saved credential expires or becomes invalid.

Provider credentials are readable by same-user native tools inside the container, as accepted in ADR 0001. They are not owner credentials. Neither `owner.token`, the Agentis database, host Codex configuration, Docker sockets, nor host browser profiles are mounted. The workspace mount contains that Run's scratch directory only; Codex receives `/workspace` as its working directory.

## Network and cleanup

Each Run has its own internal Docker network and Squid sidecar. The network explicitly disables IPv6 and sets `com.docker.network.bridge.gateway_mode_ipv4=isolated`. Docker documents that an internal network alone retains a bridge address through which host services can be reached; [isolated gateway mode removes that address](https://docs.docker.com/engine/network/port-publishing/#gateway-modes). Docker must support this option; creation fails without a fallback if it cannot. Only the sidecar connects to the external bridge. No ports are published. The Run uses the sidecar through explicit proxy environment variables. Squid permits HTTPS CONNECT on port 443 only to the exact names `auth.openai.com` and `chatgpt.com`; private and special-use destination addresses are denied before access is allowed. Arbitrary destinations and non-CONNECT requests are denied. Model shell commands cannot add provider destinations through configuration.

Containers run as UID/GID 10001 with a read-only root, dropped capabilities, no privilege gain, and CPU, memory, PID, and tmpfs limits. Login removes its sidecar and network on return. Terminal Run cleanup and daemon restart cleanup remove owned Run containers, proxy sidecars, and networks. Ownership labels are checked before removal. The provider credential volume remains for later Runs. A forcibly interrupted login may require removing its labeled login resources before retrying.

Tests using the Docker fixture establish command wiring and cleanup behavior only. Live authentication, provider calls, and host/LAN isolation need separate recorded evidence in the KAT-3243 verification artifacts. This prerequisite does not establish second-provider or handoff acceptance.
