---
type: Guide
title: "Issue tracker: GitHub"
description: "Issues and PRDs for this repo live as GitHub issues on [gannonh/agentis](https://github.com/gannonh/agentis). Use the..."
tags: []
timestamp: "2026-06-14T00:00:00Z"
---
# Issue tracker: GitHub

Issues and PRDs for this repo live as GitHub issues on [gannonh/agentis](https://github.com/gannonh/agentis). Use the `gh` CLI for all operations.

## Conventions

- **Create an issue**: `gh issue create --title "..." --body "..."`. Use a heredoc for multi-line bodies.
- **Read an issue**: `gh issue view <number> --comments`, filtering comments by `jq` and also fetching labels.
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` with appropriate `--label` and `--state` filters.
- **Comment on an issue**: `gh issue comment <number> --body "..."`
- **Apply / remove labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Close**: `gh issue close <number> --comment "..."`

Infer the repo from `git remote -v` — `gh` does this automatically when run inside a clone.

## When a skill says "publish to the issue tracker"

Create a GitHub issue.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --comments`.