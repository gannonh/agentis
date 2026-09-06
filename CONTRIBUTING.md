# Contribute to Agentis

This checkout contains foundation documentation for the unshipped Agentis 2.0 rebuild. Use Git and a shell to work on it. There is no application to start and no dependency installation, build, or test command yet.

## Check out the repository

Clone the canonical repository into a new directory:

```sh
git clone https://github.com/gannonh/agentis.git
cd agentis
```

Before Build, read [AGENTS.md](AGENTS.md), the [project plan](docs/project-plan.md), the [runtime ADR](docs/adrs/0001-runtime-and-execution-foundations.md), and the owning Linear issue. Use the [verification map](docs/verification/README.md) for required evidence and [provider eligibility research](docs/compliance.md) before making provider claims.

Run `git diff --check` before submission. Issue approval, lifecycle gates, review, and merge rules live in [AGENTS.md](AGENTS.md#issues-and-specs).

## Preserve ownership and data

Follow the [clean-room policy](docs/project-plan.md), the [runtime ADR §7 data policy](docs/adrs/0001-runtime-and-execution-foundations.md), and [Agentis foundations in AGENTS.md](AGENTS.md#agentis-foundations).
