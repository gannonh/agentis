---
name: Agentis
description: Dense builder UI for configuring agents without code — warm precision, neutral-first, square controls.
colors:
  background: "oklch(1 0 0)"
  foreground: "oklch(0.145 0 0)"
  primary: "oklch(0.52 0.105 223.128)"
  primary-foreground: "oklch(0.984 0.019 200.873)"
  muted: "oklch(0.97 0 0)"
  muted-foreground: "oklch(0.556 0 0)"
  border: "oklch(0.922 0 0)"
  input: "oklch(0.922 0 0)"
  ring: "oklch(0.708 0 0)"
  destructive: "oklch(0.577 0.245 27.325)"
  card: "oklch(1 0 0)"
  accent: "oklch(0.97 0 0)"
typography:
  display:
    fontFamily: "'JetBrains Mono Variable', monospace"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "normal"
  title:
    fontFamily: "'JetBrains Mono Variable', monospace"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "normal"
  body:
    fontFamily: "'JetBrains Mono Variable', monospace"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.75
    letterSpacing: "normal"
  label:
    fontFamily: "'JetBrains Mono Variable', monospace"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.05em"
rounded:
  none: "0"
  sm: "0.375rem"
  md: "0.5rem"
  lg: "0.625rem"
spacing:
  xs: "0.5rem"
  sm: "0.75rem"
  md: "1rem"
  lg: "1.25rem"
  xl: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.none}"
    padding: "0.5rem 0.625rem"
    height: "2rem"
  button-primary-hover:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.none}"
    padding: "0.5rem 0.625rem"
  button-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.none}"
    padding: "0.5rem 0.625rem"
    height: "2rem"
  input-default:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.none}"
    padding: "0.25rem 0.625rem"
    height: "2rem"
---

# Design System: Agentis

## 1. Overview

**Creative North Star: "The Field Manual"**

Agentis reads like documentation you can operate: warm precision, legible structure, and state that tells the truth. The product register is builder-dense (Linear, Raycast) but approachable for ops and platform users who are not writing code. Layout favors a configuration column beside a live preview, with borders and tonal panels doing most of the work.

The system explicitly rejects generic AI SaaS slop: purple gradients, glass cards, gradient text, hero metric tiles, and chatbot chrome standing in for real configuration. Depth is subtle, not theatrical.

**Key Characteristics:**

- Mono-forward typography (JetBrains Mono) with hierarchy from scale and weight, not font switching
- Neutral-first surfaces; runtime cyan accent reserved for primary actions and small markers
- Square control geometry (`rounded-none`) on buttons and inputs despite a softer global radius token
- Dense control typography (`text-xs` on interactive elements)
- Flat panels with 1px borders; light shadow only where interaction needs lift
- Phosphor icons inline with labels, never decorative icon grids

## 2. Colors

A neutral documentation palette with a restrained runtime cyan accent. Most screens should read monochrome; color signals action and system state, not brand wallpaper.

### Primary

- **Runtime Cyan** (oklch(0.52 0.105 223.128)): Primary buttons, the header marker square, and focused interactive emphasis. Use sparingly; if a screen feels "cyan-forward," pull back.

### Secondary

- Omitted. The project uses one functional accent plus neutrals. Secondary UI states use muted surfaces and outline buttons, not a second hue.

### Tertiary

- Omitted.

### Neutral

- **Paper White** (oklch(1 0 0)): Default page background in light mode.
- **Ink Black** (oklch(0.145 0 0)): Primary text and dark-mode canvas.
- **Shelf Gray** (oklch(0.97 0 0)): Muted panels (preview column uses `bg-muted/40`).
- **Annotation Gray** (oklch(0.556 0 0)): Secondary labels, field descriptions, runtime metadata lines.
- **Hairline** (oklch(0.922 0 0)): Borders on headers, preview blocks, and form sections.
- **Signal Red** (oklch(0.577 0.245 27.325)): Errors, destructive actions, and `role="alert"` failure panels.

### Named Rules

**The Neutral-First Rule.** The primary accent appears on ≤10% of any screen: primary CTAs, small markers, and critical focus rings. Neutrals carry layout, preview panels, and copy.

**The Runtime Cyan Rule.** Cyan-teal (~223°) is an infra signal, not a brand flood. Never pair it with purple gradients, neon glows, or glass overlays.

## 3. Typography

**Display Font:** JetBrains Mono Variable (monospace)
**Body Font:** JetBrains Mono Variable (monospace)
**Label/Mono Font:** Same stack; headings use `--font-heading` mapped to mono

**Character:** Technical warmth — feels like a well-maintained internal manual, not a consumer app or marketing site. Mono everywhere keeps builder metadata (runtime codes, deployment IDs) visually consistent with headings.

### Hierarchy

- **Display** (600, 1.875rem / `text-3xl`, line-height ~1.2): Page titles such as "Configure a support agent." Max one per main column.
- **Headline** (500, 0.875rem / `text-sm font-medium`): Section labels ("Template preview", deployment status titles).
- **Title** (500, 0.75rem / `text-xs font-medium uppercase`): Eyebrows ("Support template", "Hosted support").
- **Body** (400, 1rem / `text-base`, line-height 1.75): Explanatory copy; cap line length around 65–75ch (`max-w-lg`).
- **Label** (500, 0.75rem / `text-xs`): Field labels, button text, toggle items, and metadata lines.

### Named Rules

**The Dense Control Rule.** Buttons, inputs, and toggle items use `text-xs`. Body copy may be `text-base`; do not inflate control labels for "friendliness."

**The Mono Hierarchy Rule.** Differentiate levels with size, weight, and case (uppercase eyebrows), not by introducing a second font family.

## 4. Elevation

Flat-by-default with subtle lift on interactive stacks. Depth comes from bordered panels (`border-border`), background shifts (`bg-background` on nested blocks inside `bg-muted/40` preview columns), and occasional soft shadow on hover/focus — not persistent drop shadows on every card.

### Shadow Vocabulary

- **Focus ring** (`ring-1 ring-ring/50` with `border-ring`): Structural affordance on focused inputs and buttons; replaces heavy glow.
- **Panel lift** (optional `shadow-sm` on hover for preview column sections): Rare accent when a block is actively interactive; default state remains flat.

### Named Rules

**The Flat-By-Default Rule.** Surfaces at rest are flat with 1px borders. Shadows appear only as a response to focus or deliberate hover on interactive panels.

**The Border-Not-Stripe Rule.** Never use a thick colored left/right border as a decorative accent on list items or alerts. Use full borders, background tints, or typography.

## 5. Components

Tactile, dense controls in an airier layout grid. Configuration and preview stay side-by-side on large screens; stacks vertically on small.

### Buttons

- **Shape:** Square corners (`rounded-none`, 0px radius on controls).
- **Primary:** `bg-primary text-primary-foreground`, height 32px (`h-8`), horizontal padding ~10px, `text-xs font-medium`. Phosphor icon slots via `data-icon=inline-end|inline-start`.
- **Hover / Focus:** Primary hovers to ~80% opacity; focus uses `border-ring` + `ring-1 ring-ring/50`. Active (non-popup) buttons translate 1px down (`translate-y-px`).
- **Outline:** Header "Templates" control — `border-border bg-background`, hover to muted fill.
- **Destructive:** Tinted destructive background at 10–20% opacity, not solid red blocks by default.

### Chips

- **Toggle group items** act as selectable chips: `variant="outline"`, full-width vertical stack, `h-auto` with icon + title + description. Selected state via toggle group, not separate chip component.

### Cards / Containers

- **Corner Style:** Layout sections use square corners; global `--radius` is 0.625rem but preview/config **panels** use square bordered rectangles, not rounded cards.
- **Background:** Preview column `bg-muted/40`; inner blocks `bg-background` with `border-border`.
- **Shadow Strategy:** Flat at rest; see Elevation for rare lift.
- **Border:** 1px `border-border` everywhere; no nested card-in-card styling.
- **Internal Padding:** `p-3` on preview blocks, `p-4` on preview column shell, page padding `px-4 py-8` scaling to `lg:px-10`.

### Inputs / Fields

- **Style:** `h-8`, `rounded-none`, `border-input`, transparent background (light), `text-xs`.
- **Focus:** `border-ring` + `ring-1 ring-ring/50`.
- **Error:** `aria-invalid` switches border/ring to destructive; `FieldDescription` uses `text-destructive`. Alert panels use `border-destructive/50` without side stripes.

### Navigation

- **Header bar:** `min-h-14`, bottom border, brand marker (`size-2.5 bg-primary` square) + `text-sm font-medium` wordmark. Right-aligned outline button.
- **States:** No sticky glass header; solid `bg-background`.

### Template preview column

- **Signature pattern:** Right column `max-w-sm` showing template name, selected knowledge source, hosted deployment status, config DL, and chat turns. Status copy uses `text-xs` with titled sections and `aria-label` landmarks.

## 6. Do's and Don'ts

### Do:

- **Do** keep configuration and preview visible together in a two-column layout when space allows.
- **Do** show real template names, knowledge source labels, runtime provider strings, and failure codes in the preview column.
- **Do** use OKLCH tokens from `packages/ui/src/styles/globals.css` and respect light/dark via `ThemeProvider`.
- **Do** use Phosphor icons at 16px inline with labels for knowledge sources and submit actions.
- **Do** use primary cyan only for primary CTAs and small markers (≤10% of surface area).
- **Do** write errors in plain language with maintainer detail separated in muted secondary lines.

### Don't:

- **Don't** use generic AI SaaS slop: purple gradients, glassmorphism cards, gradient text, hero metric tiles, or chatbot chrome as the whole product.
- **Don't** add decorative AI branding that hides what is configured versus pending.
- **Don't** default to modal-first flows or nested identical card grids.
- **Don't** use `border-left` or `border-right` greater than 1px as a colored accent stripe on alerts or list items.
- **Don't** round buttons or inputs to pill shapes; controls stay square unless a future deliberate system change updates `buttonVariants` and `Input` together.
- **Don't** restate headings in body copy or promise capabilities the preview cannot demonstrate.
- **Don't** flood screens with chart rainbow colors; chart tokens exist for future data viz, not marketing chrome.
