# Environment variables

Source builds load secrets from a 1Password Environment through 1Password CLI. There are no
dotenv files on disk. Do not create `.env` or `.env.local`. Do not upload those files to
development servers.

`.env.example` is a committed name template only. Never copy it to `.env`.

## One-time setup

1. Install 1Password CLI **beta** `2.33.0-beta.02` or later. Current beta is `2.39.1-beta.01`.

   ```sh
   brew uninstall --cask 1password-cli
   brew install --cask 1password-cli@beta
   op --version
   ```

   Stable `op` does not have `op environment`.

2. Export the token in every shell and on every development server that runs this repo:

   ```sh
   export OP_SERVICE_ACCOUNT_TOKEN=ops_...
   op whoami
   ```

   The whoami output must be a service account. Put the same export in the server's systemd unit,
   Sprite service env, Codex secrets, or login profile. The token is the only secret that lives on
   the machine.

3. Optional: `export OP_ENVIRONMENT_ID=<id>` to use a different Environment. The default is
   `sjeqjrunoqacvlom5cjq5kizxa`.

## Run

`scripts/lib/load-repo-env.mjs` `loadRepoEnv` runs `op environment read` when
`OP_SERVICE_ACCOUNT_TOKEN` is set. Live scripts (`scripts/live-provider-conformance.mjs`,
`scripts/live-handoff-conformance.mjs`, and
`docs/verification/kat-3243/replacement-provider/run.mjs`) call `applyRepoEnv` at start. Other
commands inherit the same keys through:

```sh
node scripts/with-repo-env.mjs <cmd>
```

The published CLI (`packages/cli`, `agentis` on npm) does not load 1Password. You do not wrap
`pnpm` or `agentis` in `op run`. You do not mount a 1Password local `.env` file.

A clone without the token skips `op` (CI, unit tests, unconfigured clones). A set token and a
failed `op environment read` fail the process. Install the beta CLI, confirm the token, and confirm
the service account can read the Environment.

Process environment variables override 1Password for the same key.

## Remote development, Sprite, and Codex cloud

Install the same beta CLI and export `OP_SERVICE_ACCOUNT_TOKEN` in that environment's secrets or
service env. Clone the repo and run commands as on a laptop. Do not copy or upload a dotenv file.
Do not wrap commands in `op run`. Do not mount a local `.env`.

GitHub Actions production secrets stay in GitHub.
