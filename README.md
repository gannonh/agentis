# Agentis

Agentis is a planned system for recurring agent work, retained results, explicit action approvals, and recovery after interruptions.

This checkout contains foundation documentation for an unshipped rebuild. It has no runnable application, package manifest, build, or test commands. Provider support and runtime behavior remain unverified.

## Release identity

The canonical repository is [gannonh/agentis](https://github.com/gannonh/agentis). The planned release is `@agentis-labs/cli` version 2.0, with the `agentis` binary. The currently published package does not contain this rebuild. The unscoped `agentis` npm package is unrelated.

There is no supported installation of this rebuild yet. After publication, the npm installation target will be `@agentis-labs/cli@2`.

The former implementation remains on [`archive/agentis-v1`](https://github.com/gannonh/agentis/tree/archive/agentis-v1) at commit [`78bf37491942552b6cb14cfe43b1a7463b723f48`](https://github.com/gannonh/agentis/commit/78bf37491942552b6cb14cfe43b1a7463b723f48).

## Planned data policy

Version 2.0 will use a fresh data root at `~/.agentis/v2/`, with an explicit override. It will preserve old data and refuse to execute against unsupported schemas. The design excludes legacy compatibility, automatic migrations, destructive resets, and fallback storage. The [runtime ADR](docs/adrs/0001-runtime-and-execution-foundations.md) records this policy.

## Documentation

The repository records the rebuild's direction and required evidence in these documents:

- [Project plan](docs/project-plan.md): product scope, delivery gates, and clean-room reuse policy.
- [Runtime ADR](docs/adrs/0001-runtime-and-execution-foundations.md): runtime, persistence, authorization, and recovery decisions.
- [Verification map](docs/verification/README.md): required proofs and remaining evidence gaps.
- [Provider access and evidence register](docs/compliance.md): eligibility research and unverified provider candidates.
- [Contributing](CONTRIBUTING.md): checkout steps and the contribution process.
- [Development lifecycle](AGENTS.md#issues-and-specs): Linear specifications, approval, review, and merge gates.

## License and reuse

Agentis uses the [Apache License 2.0](LICENSE), with attribution in [NOTICE](NOTICE). The [clean-room policy](docs/project-plan.md) permits studying OpenMausBot and CopilotKit behavior without copying their source, documentation, or assets. Reuse of archived Agentis material requires a provenance and architectural-fit check.
