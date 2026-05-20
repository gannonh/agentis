---
name: Agentis
description: Self-hosted agent workspace for long-running work, reusable agents, integrations, artifacts, and quality controls.
colors:
  workbench-bg: "oklch(1 0 0)"
  ink-primary: "oklch(0.145 0 0)"
  ink-muted: "oklch(0.556 0 0)"
  surface-raised: "oklch(1 0 0)"
  surface-muted: "oklch(0.97 0 0)"
  border-subtle: "oklch(0.922 0 0)"
  inverse-foreground: "oklch(0.985 0 0)"
  dark-workbench-bg: "oklch(0.145 0 0)"
  dark-surface: "oklch(0.205 0 0)"
  dark-muted: "oklch(0.269 0 0)"
  dark-border-subtle: "oklch(1 0 0 / 10%)"
  agent-blue: "oklch(0.488 0.243 264.376)"
  status-success: "oklch(0.52 0.14 155)"
  status-warning: "oklch(0.68 0.14 75)"
  status-info: "oklch(0.55 0.12 250)"
  destructive: "oklch(0.577 0.245 27.325)"
typography:
  display:
    fontFamily: "IBM Plex Sans Variable, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 500
    lineHeight: 1.2
  headline:
    fontFamily: "IBM Plex Sans Variable, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 500
    lineHeight: 1.3
  title:
    fontFamily: "IBM Plex Sans Variable, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.4
  body:
    fontFamily: "IBM Plex Sans Variable, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "IBM Plex Sans Variable, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.5
rounded:
  sm: "0.375rem"
  md: "0.5rem"
  lg: "0.625rem"
  xl: "0.875rem"
  2xl: "1.125rem"
spacing:
  compact-x: "0.5rem"
  compact-y: "0.25rem"
  control-x: "0.625rem"
  page: "1.5rem"
components:
  button-primary:
    backgroundColor: "{colors.ink-primary}"
    textColor: "{colors.inverse-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0.25rem 0.5rem"
    height: "1.75rem"
  button-primary-hover:
    backgroundColor: "oklch(0.145 0 0 / 80%)"
    textColor: "{colors.inverse-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0.25rem 0.5rem"
    height: "1.75rem"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0.25rem 0.5rem"
    height: "1.75rem"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0.25rem 0.5rem"
    height: "1.75rem"
---

# Design System: Agentis

## 1. Overview

**Creative North Star: "The Quiet Workshop"**

Agentis should feel like a composed workbench for autonomous work. The interface supports long-running tasks, reusable agents, connected tools, artifacts, and quality controls with quiet precision. It should make complex agent behavior visible without turning the product into a spectacle.

The current system is a product register foundation: IBM Plex Sans, shadcn/ui primitives, Tailwind 4, compact Base UI buttons, OKLCH tokens, and a themeable light or dark surface. The product atmosphere is restrained, operational, and exact. It rejects generic AI SaaS patterns: purple gradients, vague magic language, floating orbs, mascot energy, and undifferentiated AI dashboard clichés.

**Key Characteristics:**
- Dense enough for expert workflows, calm enough for first-run comprehension.
- Tonal layers, borders, and focus rings carry hierarchy before shadow does.
- Accent color is functional: active navigation, selection, status, and primary intent.
- Components are compact, readable, and visibly stateful.

## 2. Colors

The palette is a restrained neutral workbench with a single agent-blue accent available for selected and current states.

### Primary
- **Workbench Ink**: The default action and text anchor. Use it for primary buttons, dominant labels, and high-priority foreground content.
- **Agent Blue**: The functional accent for active navigation, selected agents, current run state, and focus-worthy system markers. Keep it rare.

### Neutral
- **Quiet Workbench**: The main canvas for app screens and starter routes.
- **Raised Surface**: The surface role for cards, menus, and popovers when components are added.
- **Muted Surface**: The secondary layer for sidebars, toolbar regions, empty states, and inactive controls.
- **Subtle Divider**: The border and input boundary color. Use it to separate regions without visual weight.
- **Muted Ink**: Secondary labels, helper copy, metadata, and timestamps.

### Named Rules

**The Functional Accent Rule.** Agent Blue appears only when it tells the user where they are, what is selected, or what action matters.

**The Neutral Honesty Rule.** Neutral surfaces must carry most of the product. If a screen needs decoration to feel complete, the information structure is not strong enough.

## 3. Typography

**Display Font:** IBM Plex Sans Variable with sans-serif fallback  
**Body Font:** IBM Plex Sans Variable with sans-serif fallback  
**Label/Mono Font:** IBM Plex Sans Variable for labels; use system monospace only for code, IDs, logs, and command output.

**Character:** IBM Plex Sans gives Agentis a technical but approachable product voice. The type should feel exact in labels, calm in prose, and compact in controls.

### Hierarchy
- **Display** (500, 1.875rem, 1.2): Route titles, onboarding headlines, and important empty-state headings.
- **Headline** (500, 1.25rem, 1.3): Section headers and major panel titles.
- **Title** (500, 1rem, 1.4): Card titles, dialogs, grouped controls, and form sections.
- **Body** (400, 0.875rem, 1.6): Main UI copy, descriptions, and readable explanations. Cap prose at 65 to 75 characters per line.
- **Label** (500, 0.75rem, 1.5): Buttons, nav labels, metadata, status chips, and compact controls.

### Named Rules

**The Compact Clarity Rule.** Controls may be small, but labels must stay readable and focusable. Do not trade legibility for density.

## 4. Elevation

Agentis is flat by default and uses tonal layering for depth. Borders, muted surfaces, active states, and focus rings define structure. Shadows should be reserved for overlays, popovers, menus, and drag or hover states that need temporary separation.

### Named Rules

**The Tonal Layer Rule.** Start with surface contrast and border clarity. Add shadow only when an element floats above the document flow.

## 5. Components

### Buttons

Precise, compact, calm.

- **Shape:** Gently compact corners using the medium radius token (0.5rem).
- **Primary:** Workbench Ink background with inverse foreground, compact horizontal padding, and a 1.75rem default height.
- **Hover / Focus:** Hover shifts the primary fill by opacity. Focus uses a visible ring and border treatment. Active state may translate down by 1px for tactile confirmation.
- **Secondary / Ghost / Outline:** Secondary uses muted surface. Outline uses a subtle border and transparent fill. Ghost stays transparent until hover or expanded state.
- **Destructive:** Use a tinted destructive background and destructive text. Never use full-saturation destructive fills for routine inactive states.

### Theme Surfaces

The global surface vocabulary is ready for app shell work: background, card, popover, muted, accent, border, input, ring, and sidebar tokens exist in both light and dark themes.

- **Corner Style:** Medium radius by default (0.5rem to 0.625rem).
- **Background:** Use Quiet Workbench for the main canvas, Raised Surface for floating content, and Muted Surface for secondary regions.
- **Shadow Strategy:** See Elevation. Tonal layers first, shadows for overlays.
- **Border:** Subtle Divider for panels and inputs.
- **Internal Padding:** Use compact spacing for dense controls and 1.5rem page padding for starter layouts.

## 6. Do's and Don'ts

### Do:
- **Do** use the product register by default: app shell, threads, agents, command center, integrations, and task workflows.
- **Do** make agent work legible through state, steps, tools, outputs, and quality signals.
- **Do** keep accent color functional: active navigation, current selection, system status, and primary intent.
- **Do** use tonal layers and subtle borders before shadow.
- **Do** support WCAG 2.2 AA with keyboard access, visible focus, reduced motion support, sufficient contrast, semantic structure, and non-color-only state indicators.

### Don't:
- **Don't** use generic AI SaaS patterns: purple gradients, vague magic language, floating orbs, mascot energy, and undifferentiated AI dashboard clichés.
- **Don't** use gradient text.
- **Don't** use side-stripe borders as colored accents on cards, list items, callouts, or alerts.
- **Don't** use glassmorphism as decoration.
- **Don't** create identical card grids with icon, heading, and text repeated without meaningful structure.
- **Don't** make agent autonomy feel opaque, unserious, or decorative.
