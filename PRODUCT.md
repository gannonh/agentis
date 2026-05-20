# Product

## Register

product

## Users

Ops and platform builders who need to stand up useful agents (support, ops, internal) without writing application code. They work in focused sessions: pick a template, attach knowledge, validate behavior, and prepare a deployment path. They are comfortable with technical concepts (runtime boundaries, tokens, deployment targets) but should not have to author custom integrations by hand.

## Product Purpose

Agentis is an early-stage SaaS for configuring and deploying useful agents without code. Success means a builder leaves a session having configured something real: a named template, grounded knowledge sources, a credible preview of agent answers, and a clear path to hosted deployment. The product should reduce guesswork about what will run in production and what credentials or runtime boundaries apply.

## Brand Personality

Precise, warm, practical. The interface should feel like a capable builder tool (Linear, Raycast) made legible for people who are not full-time developers: direct labels, honest state, no hype. Warmth shows up in helpful defaults and plain-language errors, not decoration.

## Anti-references

- Generic AI SaaS slop: purple gradients, glassmorphism cards, gradient text, hero metric tiles, chatbot chrome as the whole product.
- Decorative AI branding that substitutes for showing real configuration, preview, and deployment state.
- Modal-first flows and nested card grids that hide what is configured versus what is still pending.
- Copy that restates headings or promises capabilities the preview cannot demonstrate.

## Design Principles

1. **Show the real thing.** Previews and status panels should reflect actual template names, knowledge selections, runtime labels, and failure codes, not placeholder marketing.
2. **Respect builder literacy.** Surface runtime boundaries, deployment targets, and credential expectations in plain language without forcing users to read source code.
3. **Prefer inline setup.** Exhaust progressive disclosure in the main flow before modals; keep configuration and preview visible together when possible.
4. **Earn confidence through working paths.** A successful session ends with something the user could demo or deploy, not a polished empty shell.
5. **Stay out of the AI aesthetic trap.** Avoid category-reflex palettes and layouts that signal "another AI wrapper"; let craft come from hierarchy, spacing, and honest state.

## Accessibility & Inclusion

Pragmatic baseline: fix obvious keyboard, contrast, and labeling issues as surfaces ship; prefer semantic structure and visible focus. Honor `prefers-reduced-motion` when adding motion. Formal WCAG 2.2 AA conformance can harden over time; do not ship knowingly blocking failures for core setup and chat flows.
