import type {
  StaticArtifactRenderMode,
  StaticArtifactTheme,
  StaticArtifactType,
} from "@workspace/shared"
import { validateStaticArtifactMode } from "@workspace/shared"

export type StaticArtifactThemeDescriptor = {
  id: StaticArtifactTheme
  description: string
}

export const WEBPAGE_STATIC_ARTIFACT_THEMES: StaticArtifactThemeDescriptor[] = [
  { id: "editorial", description: "Essays and narrative reports." },
  { id: "data", description: "Analytics reports and data-heavy writeups." },
  {
    id: "developer",
    description: "Technical docs and implementation guides.",
  },
  { id: "design", description: "Portfolios, case studies, and visual explainers." },
  { id: "academic", description: "Research summaries and formal references." },
  { id: "warm", description: "Lifestyle, recipes, and people-centered narratives." },
  {
    id: "midnight",
    description: "Dark-mode reports and high-contrast technical pieces.",
  },
  {
    id: "terminal",
    description: "Retro technical and command-line inspired pages.",
  },
  { id: "landing", description: "Marketing pages and product announcements." },
  {
    id: "playful",
    description: "Educational, exploratory, and approachable pages.",
  },
]

export const SLIDE_STATIC_ARTIFACT_THEMES: StaticArtifactThemeDescriptor[] = [
  { id: "keynote", description: "Product reveals and launches." },
  { id: "pitch", description: "Investor and sales narratives." },
  { id: "ted", description: "Thought leadership and one-big-idea presentations." },
  { id: "corporate", description: "Board reviews and operating updates." },
  { id: "workshop", description: "Training and facilitated sessions." },
  { id: "cinematic", description: "Theatrical launches and visual reveals." },
  { id: "neon", description: "Developer and technical demos." },
  { id: "gallery", description: "Image-forward showcases." },
  { id: "infographic", description: "Data storytelling and comparisons." },
  {
    id: "playful",
    description: "Approachable teaching and lightweight storytelling.",
  },
]

export const STATIC_ARTIFACT_SHARED_THEME_SELECTORS: StaticArtifactThemeDescriptor[] = [
  {
    id: "auto",
    description:
      "Agentis selects the most suitable preset from content and purpose.",
  },
  {
    id: "surprise",
    description:
      "Agentis may choose a more expressive preset while staying within safety constraints.",
  },
  {
    id: "bespoke",
    description:
      "Agentis follows a user-provided bespoke style brief and records a summary of that brief.",
  },
]

type StaticArtifactFormatGuidanceKey =
  | "webpage:html"
  | "slides:html"
  | "slides:polishedImage"

export const STATIC_ARTIFACT_FORMAT_GUIDANCE = {
  "webpage:html": [
    "Optimize for reading and scanning from top to bottom.",
    "Use semantic sections, responsive width, accessible hierarchy, and clear navigation where useful.",
    "Support optional hero imagery and section imagery when explicitly requested or helpful.",
    "Use static charts only when data is provided or generated from source material.",
  ],
  "slides:html": [
    "Optimize for one idea per screen.",
    "Include keyboard navigation, slide counter, and responsive full-screen layout.",
    "Use live text and static charts when precision matters.",
    "Keep word-level editability by storing HTML/CSS/JS as the version content.",
  ],
  "slides:polishedImage": [
    "Optimize for cinematic or highly visual decks.",
    "Limit text density because slide text is rendered into images.",
    "Do not use for dense data, live charts, or content that needs word-level edits.",
    "Persist one image asset per slide plus slide ordering and metadata.",
  ],
} as const satisfies Record<StaticArtifactFormatGuidanceKey, readonly string[]>

export function validateStaticArtifactTheme(
  artifactType: StaticArtifactType,
  theme: StaticArtifactTheme
):
  | { ok: true }
  | { ok: false; code: "static_artifact_invalid_type"; message: string } {
  if (
    STATIC_ARTIFACT_SHARED_THEME_SELECTORS.some(
      (descriptor) => descriptor.id === theme
    )
  ) {
    return { ok: true }
  }

  const themes =
    artifactType === "webpage"
      ? [...WEBPAGE_STATIC_ARTIFACT_THEMES, ...SLIDE_STATIC_ARTIFACT_THEMES]
      : [...SLIDE_STATIC_ARTIFACT_THEMES, ...WEBPAGE_STATIC_ARTIFACT_THEMES]

  if (themes.some((descriptor) => descriptor.id === theme)) {
    return { ok: true }
  }

  return {
    ok: false,
    code: "static_artifact_invalid_type",
    message: `Theme ${theme} is not supported for ${artifactType} artifacts.`,
  }
}

function getThemeDescriptor(
  artifactType: StaticArtifactType,
  theme: StaticArtifactTheme
): StaticArtifactThemeDescriptor {
  const descriptor = [
    ...STATIC_ARTIFACT_SHARED_THEME_SELECTORS,
    ...(artifactType === "webpage"
      ? [...WEBPAGE_STATIC_ARTIFACT_THEMES, ...SLIDE_STATIC_ARTIFACT_THEMES]
      : [...SLIDE_STATIC_ARTIFACT_THEMES, ...WEBPAGE_STATIC_ARTIFACT_THEMES]),
  ].find((candidate) => candidate.id === theme)

  if (!descriptor) {
    throw new Error(`Static artifact theme not found: ${theme}`)
  }

  return descriptor
}

function summarizeStyleBrief(brief: string | undefined): string | undefined {
  const normalized = brief?.replace(/\s+/g, " ").trim()
  if (!normalized) return undefined
  return normalized.length > 240 ? `${normalized.slice(0, 237)}...` : normalized
}

export function getStaticArtifactDesignGuidance(input: {
  artifactType: StaticArtifactType
  renderMode: StaticArtifactRenderMode
  theme?: StaticArtifactTheme
  bespokeStyleBrief?: string
}) {
  const mode = validateStaticArtifactMode(input.artifactType, input.renderMode)
  if (!mode.ok) {
    throw new Error(mode.message)
  }

  const theme = input.theme ?? "auto"
  const themeValidation = validateStaticArtifactTheme(input.artifactType, theme)
  if (!themeValidation.ok) {
    throw new Error(themeValidation.message)
  }

  return {
    selectedTheme: getThemeDescriptor(input.artifactType, theme),
    formatGuidance:
      STATIC_ARTIFACT_FORMAT_GUIDANCE[
        `${input.artifactType}:${input.renderMode}` as StaticArtifactFormatGuidanceKey
      ],
    bespokeStyleBriefSummary: summarizeStyleBrief(input.bespokeStyleBrief),
  }
}
