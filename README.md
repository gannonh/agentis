# Agentis

Agentis is a planned system for recurring agent work, retained results, explicit action approvals, and recovery after interruptions.

This checkout now includes the Gate 0 CLI/daemon slice (`@agentis-labs/cli`). Provider support is not a public claim. Fake fixture evidence lives in CI. Live Codex and macOS isolation remain separately recorded.

## Release identity

The canonical repository is [gannonh/agentis](https://github.com/gannonh/agentis). The planned release is `@agentis-labs/cli` version 2.0, with the `agentis` binary. The currently published package does not contain this rebuild. The unscoped `agentis` npm package is unrelated.

From this checkout:

```sh
pnpm install
pnpm build
pnpm agentis verify launch
```

`verify launch` requires a running Docker engine and a non-root user on macOS or Linux. It fetches the pinned Node image if missing, then runs the fixture daemon in an offline container. Its loopback endpoint remains accessible to the host CLI. Ctrl-C stops the fixture container; the fresh temporary data root remains available for inspection.

Control commands need `--endpoint` or `--profile`. The CLI does not guess a port. After publication, the npm install target is `@agentis-labs/cli@2`.

The former implementation remains on [`archive/agentis-v1`](https://github.com/gannonh/agentis/tree/archive/agentis-v1) at commit [`78bf37491942552b6cb14cfe43b1a7463b723f48`](https://github.com/gannonh/agentis/commit/78bf37491942552b6cb14cfe43b1a7463b723f48).

## Documentation

The repository records the rebuild's direction and required evidence in these documents:

- [Project plan](docs/project-plan.md): product scope, delivery gates, and clean-room reuse policy.
- [Runtime ADR](docs/adrs/0001-runtime-and-execution-foundations.md): runtime, persistence, authorization, and recovery decisions.
- [Verification map](docs/verification/README.md): required proofs and remaining evidence gaps.
- [Provider access and evidence register](docs/compliance.md): eligibility research and unverified provider candidates.
- [Contributing](CONTRIBUTING.md): checkout steps and the contribution process.
- [Development lifecycle](AGENTS.md#issues-and-specs): Linear specifications, approval, review, and merge gates.
- [Environment variables](docs/operations/environment-variables.md): source-build secrets load from a 1Password Environment.

## License and reuse

Agentis uses the [Apache License 2.0](LICENSE), with attribution in [NOTICE](NOTICE). Reuse policy is in the [project plan](docs/project-plan.md) and [CONTRIBUTING.md](CONTRIBUTING.md).
