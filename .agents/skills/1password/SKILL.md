---
name: 1password
description: "Loads Agentis source-build secrets from a 1Password Environment via CLI and a service account. Use when the user or task mentions 1Password, op, OP_SERVICE_ACCOUNT_TOKEN, environment variables, secrets, dotenv, .env, Sprite, Codex cloud, live conformance, or provider keys. Do not create, read, or upload dotenv files."
---

# 1Password Environments

Source builds load secrets from 1Password Environment `sjeqjrunoqacvlom5cjq5kizxa`. There are no dotenv files. `scripts/lib/load-repo-env.mjs` `loadRepoEnv` is the only source-build env boundary.

Canonical runbook: [docs/operations/environment-variables.md](../../../docs/operations/environment-variables.md). CLI details: [references/cli.md](references/cli.md).

## Hard rules

- Do not create, read, symlink, or upload `.env` or `.env.local`.
- Do not copy `.env.example` to `.env`. That file is a name template.
- Do not wrap `pnpm`, `agentis`, or any repo command in `op run` or `op run --environment`.
- Do not mount a 1Password local / FIFO `.env`. Desktop approval is the rejected path.
- Do not write `op://vault/item/field` references into files. That is a different 1Password feature (vault items). This repo uses Environments.
- Do not print, log, commit, or paste secret values, token strings, or `op environment read` stdout.
- GitHub Actions production secrets stay in GitHub. Do not move them into the Environment unless a spec says so.
- The published CLI does not call `op`.

If asked to "just make a .env" or copy dotenv onto a server, follow this skill instead.

## Setup (every machine)

1. Install 1Password CLI **beta** `2.33.0-beta.02` or later (`brew install --cask 1password-cli@beta`). Stable `op` has no `op environment`.
2. Export `OP_SERVICE_ACCOUNT_TOKEN` for a service account that can read Environment `sjeqjrunoqacvlom5cjq5kizxa`. Same export in systemd, Sprite service env, Codex secrets, or the login profile. The token is the only secret that lives on the machine.
3. Confirm `op whoami` is a service account. Desktop-app integration is not a substitute.
4. Delete leftover `.env` / `.env.local` if they exist. Do not upload them.
5. Run repo commands as today. Live scripts call `applyRepoEnv`. Other commands: `node scripts/with-repo-env.mjs <cmd>`.

`OP_ENVIRONMENT_ID` overrides the Environment id. Process env overrides 1Password for the same key. Keys that are not in the Environment belong in the process environment (shell export / unit / Sprite service env), never in a dotenv file.

## How load works

When `OP_SERVICE_ACCOUNT_TOKEN` is set, `loadRepoEnv` runs `op environment read <id>` and parses stdout.

- Missing token: skip `op` (CI, tests, unconfigured clones).
- Token set and `op` fails: hard error (`OnePasswordEnvironmentReadError`). Fix CLI, token, or Environment access. Do not fall back to files.

## Adding or changing a secret

1. Put the key in the 1Password Environment (default id above).
2. Name it in `.env.example` only if it is a source-build name the repo should document.
3. Do not write the value into the checkout.

## Diagnose without leaking values

```sh
op --version
op environment --help
op whoami
test -n "${OP_SERVICE_ACCOUNT_TOKEN:-}"
```

`op --version` must be beta. `op whoami` must be a service account. To list **names only**:

```sh
op environment read "${OP_ENVIRONMENT_ID:-sjeqjrunoqacvlom5cjq5kizxa}" | awk -F= 'NF{print $1}'
```

Never paste that command's unfiltered stdout into chat. If `loadRepoEnv` throws, report the error class and the first stderr line `op` already sanitized, not the Environment payload.

## Other development environments

Sprite, Codex cloud, and a second laptop use the same path: beta CLI plus `OP_SERVICE_ACCOUNT_TOKEN` in that environment's secrets or service env. Do not copy a `.env`.
