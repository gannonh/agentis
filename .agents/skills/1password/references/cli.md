# 1Password CLI for Agentis

## Install

```sh
brew uninstall --cask 1password-cli
brew install --cask 1password-cli@beta
op --version
```

Need `op environment`. If that subcommand is missing, the binary is stable or too old. Minimum: `2.33.0-beta.02`.

The service account token authenticates the CLI. Do not run `op signin` for source-build loads. Desktop app approval is the rejected remote path.

## Auth check

```sh
export OP_SERVICE_ACCOUNT_TOKEN=ops_...
op whoami
```

Expect a service account. Account or user sign-in is the wrong mode for headless source builds.

## Environments vs vault items

| Feature                           | Command                                          | This repo                                                       |
| --------------------------------- | ------------------------------------------------ | --------------------------------------------------------------- |
| Environments                      | `op environment read <id>`                       | Source-build secrets. `loadRepoEnv` does this.                  |
| Vault item refs                   | `op://vault/item/field` plus `op run --env-file` | Do not use.                                                     |
| `op run --environment`            | injects the Environment then execs a child       | Do not wrap `pnpm` or `agentis`. The Node loader already reads. |
| Destinations / local `.env` mount | FIFO file, desktop approval                      | Do not use.                                                     |

This CLI beta exposes `op environment read` only. A successful names-only read (see the skill) confirms the service account can read the Environment. Do not dump `op environment read` into a transcript.

## Persist the token

The token must be in the environment of every process that runs live scripts or `scripts/with-repo-env.mjs`. Examples: shell profile, systemd `Environment=`, Sprite service env, Codex secrets. Do not put it in a repo `.env`.
