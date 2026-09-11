# Contribute to Agentis

This checkout contains the Agentis 2.0 rebuild, including the Gate 0 CLI/daemon package. Use Git and a shell. Node 24.20.0 and pnpm 9.15.9 are required.

## Check out the repository

Clone the canonical repository into a new directory:

```sh
git clone https://github.com/gannonh/agentis.git
cd agentis
```

Before Build, read [AGENTS.md](AGENTS.md), the [project plan](docs/project-plan.md), the [runtime ADR](docs/adrs/0001-runtime-and-execution-foundations.md), and the owning Linear issue. Use the [verification map](docs/verification/README.md) for required evidence and [provider eligibility research](docs/compliance.md) before making provider claims.

```sh
pnpm install
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Source-build secrets come from a 1Password Environment. See
[environment variables](docs/operations/environment-variables.md) and
`.agents/skills/1password`. Do not create dotenv files.

`agentis serve` and `agentis doctor` require `--endpoint` or `--profile`. Run `git diff --check` before submission. Issue approval, lifecycle gates, review, and merge rules live in [AGENTS.md](AGENTS.md#issues-and-specs).

## Preserve ownership and data

Follow the [clean-room policy](docs/project-plan.md), the [runtime ADR §7 data policy](docs/adrs/0001-runtime-and-execution-foundations.md), and [Agentis foundations in AGENTS.md](AGENTS.md#agentis-foundations).
