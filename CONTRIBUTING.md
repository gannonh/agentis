# Contribute to Agentis

This checkout contains foundation documentation for the unshipped Agentis 2.0 rebuild. Use Git and a shell to work on it. There is no application to start and no dependency installation, build, or test command yet.

## Check out the repository

Clone the canonical repository into a new directory:

```sh
git clone https://github.com/gannonh/agentis.git
cd agentis
```

Check that Git tracks the foundation documents:

```sh
git ls-files --error-unmatch README.md CONTRIBUTING.md AGENTS.md LICENSE NOTICE docs/project-plan.md docs/adrs/0001-runtime-and-execution-foundations.md docs/verification/README.md docs/compliance.md
```

The command prints each path and exits successfully when all files are present. Check the preserved implementation's reference:

```sh
git rev-parse origin/archive/agentis-v1
```

The expected commit is `78bf37491942552b6cb14cfe43b1a7463b723f48`.

Read [AGENTS.md](AGENTS.md), the [project plan](docs/project-plan.md), the [runtime ADR](docs/adrs/0001-runtime-and-execution-foundations.md), and the owning Linear issue before Build. Use the [verification map](docs/verification/README.md) to identify required evidence. Check [provider eligibility research](docs/compliance.md) before making provider claims.

## Start approved work

1. Use a Linear issue and its parent epic as the specification. Keep acceptance criteria and status in Linear, and code, commits, pull requests, CI, and diff reviews in GitHub. For an inbound GitHub Issue, create a full Linear spec and link the original issue. Small copy changes and single config values are exempt from the issue requirement.
2. Keep research and planning in Backlog. Moving an issue to Todo approves it. Wait for an explicit assignment or start instruction, then move it to In Progress before Build.
3. Create the branch using Linear's generated branch name. Implement only the issue's acceptance criteria. If the spec changes, update the issue before continuing. File unrelated discoveries as new Backlog issues.
4. Keep durable rationale and artifacts under `docs/`. If blocked, comment on the Linear issue with the exact missing input and stop.

## Preserve ownership and data

Follow the [clean-room policy](docs/project-plan.md). Study OpenMausBot and CopilotKit behavior without copying their source, documentation, or assets. Derive protocol behavior from specifications and provider documentation. Check provenance and architectural fit before reusing archived Agentis material. Exclude third-party enterprise and excluded adapter code. Preserve accurate attribution in [LICENSE](LICENSE) and [NOTICE](NOTICE).

Follow the planned data policy in the [runtime ADR](docs/adrs/0001-runtime-and-execution-foundations.md). Use a fresh `~/.agentis/v2/` root with an explicit override when implementing storage. Preserve existing data and refuse unsupported schemas. Do not add legacy compatibility, migrations, destructive resets, or fallback storage.

## Submit and review a change

1. Verify the changed artifact. For documentation, check file references, command examples, and consistency with the plan and issue. Run `git diff --check` before submission.
2. For behavior changes, include isolated fixture evidence. Add focused live evidence for changed provider behavior. Follow the [verification map](docs/verification/README.md) for required records and UI evidence. The planned `agentis verify launch` command must arrive with the first daemon slice. It does not exist in this checkout.
3. Name exactly one Linear issue ID in an implementing PR's title or body. Keep draft PRs in In Progress. When work is complete, mark the PR ready for review and move the issue to Agent Review.
4. In Agent Review, fix CI and answer every human and bot review thread on the existing branch. Reply with a reason when resolving a false-positive bot finding. Move the issue to Human Review when the PR is ready for review, merges cleanly, has passing required CI, and has no open review threads or unanswered comments.
5. Pause agent coding, CI fixes, and review runs in Human Review until the issue moves or a human says resume. A human may use this state to pause work at any time.
6. Merge only when the issue is in Merging. After merge, move it to Done, confirm that the acceptance criteria landed, and record verification on the issue. Reopen the issue or create a linked issue if criteria did not land. Release follows verification.

If a PR closes without merging, record the reason on the issue and move it to Todo. Canceled and Duplicate are terminal states. Create a new issue for new work. The [development lifecycle](AGENTS.md#issues-and-specs) defines these gates.
