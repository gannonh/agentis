import type {
  ProposedToolGrant,
  RunStep,
  UnsupportedSourceStep,
} from "@workspace/shared"

type AnalyzeThreadToolUsageInput = {
  steps: RunStep[]
  connectedToolkitSlugs: string[]
  connectedToolkitConnectionIds?: Record<string, string>
}

type ToolMapping = {
  slug: string
  label: string
  prefixes: string[]
}

const TOOL_MAPPINGS: ToolMapping[] = [
  { slug: "github", label: "GitHub", prefixes: ["GITHUB_"] },
  { slug: "slack", label: "Slack", prefixes: ["SLACK_"] },
  { slug: "gmail", label: "Gmail", prefixes: ["GMAIL_"] },
  {
    slug: "google-drive",
    label: "Google Drive",
    prefixes: ["GOOGLE_DRIVE_", "GOOGLEDRIVE_"],
  },
  { slug: "airtable", label: "Airtable", prefixes: ["AIRTABLE_"] },
]

function getToolName(step: RunStep): string | undefined {
  const value = step.payload?.toolName ?? step.payload?.tool
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function displayName(mapping: ToolMapping, toolName: string): string {
  const prefix = mapping.prefixes.find((candidate) =>
    toolName.toUpperCase().startsWith(candidate)
  )
  const suffix = prefix ? toolName.slice(prefix.length) : toolName
  const words = suffix
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .join(" ")
  return words ? `${mapping.label} ${words}` : mapping.label
}

function findMapping(toolName: string): ToolMapping | undefined {
  const normalized = toolName.toUpperCase()
  return TOOL_MAPPINGS.find((mapping) =>
    mapping.prefixes.some((prefix) => normalized.startsWith(prefix))
  )
}

function connectedGrant(
  mapping: ToolMapping,
  toolName: string,
  connectedToolkitSlugs: Set<string>,
  connectedToolkitConnectionIds: Record<string, string>
): ProposedToolGrant {
  if (connectedToolkitSlugs.has(mapping.slug)) {
    return {
      toolkitSlug: mapping.slug,
      toolName,
      displayName: displayName(mapping, toolName),
      required: true,
      validationStatus: "valid",
      connectionId: connectedToolkitConnectionIds[mapping.slug],
    }
  }

  return {
    toolkitSlug: mapping.slug,
    toolName,
    displayName: displayName(mapping, toolName),
    required: true,
    validationStatus: "missing_access",
    remediation: {
      code: "toolkit_not_connected",
      message: `Connect ${mapping.label} before creating this agent.`,
    },
  }
}

function isToolStep(step: RunStep): boolean {
  return step.type === "tool-call" || step.type === "tool-result"
}

export function analyzeThreadToolUsage({
  steps,
  connectedToolkitSlugs,
  connectedToolkitConnectionIds = {},
}: AnalyzeThreadToolUsageInput): {
  proposedToolGrants: ProposedToolGrant[]
  unsupportedSourceSteps: UnsupportedSourceStep[]
} {
  const connected = new Set(connectedToolkitSlugs)
  const proposedByToolkit = new Map<string, ProposedToolGrant>()
  const unsupportedSourceSteps: UnsupportedSourceStep[] = []

  for (const step of steps.filter(isToolStep)) {
    const toolName = getToolName(step)
    if (!toolName) {
      unsupportedSourceSteps.push({
        id: step.id,
        title: step.title,
        reason: "missing_metadata",
        details: "The source step did not include a tool name.",
      })
      continue
    }

    const mapping = findMapping(toolName)
    if (!mapping) {
      unsupportedSourceSteps.push({
        id: step.id,
        title: step.title,
        reason: "unsupported_tool",
        toolName,
        details: "No matching integration is available for this source step.",
      })
      continue
    }

    if (!proposedByToolkit.has(mapping.slug)) {
      proposedByToolkit.set(
        mapping.slug,
        connectedGrant(
          mapping,
          toolName,
          connected,
          connectedToolkitConnectionIds
        )
      )
    }

    if (step.status === "failed") {
      unsupportedSourceSteps.push({
        id: step.id,
        title: step.title,
        reason: "incomplete_tool_call",
        toolName,
        details: "The source tool step did not complete successfully.",
      })
    }
  }

  return {
    proposedToolGrants: [...proposedByToolkit.values()],
    unsupportedSourceSteps,
  }
}
