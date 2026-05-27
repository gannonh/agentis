import type {
  AgentPromotionDraftToolGrantProposal,
  RunStep,
  UnsupportedSourceStep,
} from "@workspace/shared"
import {
  CURATED_COMPOSIO_TOOLS,
  SUPPORTED_TOOLKIT_NAMES,
} from "../composio/tool-catalog.js"

type AnalyzeThreadToolUsageInput = {
  steps: RunStep[]
}

function payloadString(
  payload: Record<string, unknown> | null | undefined,
  key: string
): string | undefined {
  const value = payload?.[key]
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function normalizedToken(value: string): string {
  return value.replace(/[^a-z0-9]/gi, "").toUpperCase()
}

function toolkitToolPrefixes(toolkitSlug: string): string[] {
  const curatedPrefix = CURATED_COMPOSIO_TOOLS[toolkitSlug]?.toolSlug.split("_")[0]
  return [curatedPrefix, toolkitSlug.replace(/-/g, "_")]
    .filter((prefix): prefix is string => Boolean(prefix))
    .map((prefix) => `${prefix.toUpperCase()}_`)
}

function toolkitFromToolName(toolName: string | undefined): string | undefined {
  if (!toolName) return undefined
  if (toolName.startsWith("composio_")) {
    return toolName.replace(/^composio_/, "").replace(/_/g, "-")
  }

  const normalizedToolName = normalizedToken(toolName)
  return Object.keys(CURATED_COMPOSIO_TOOLS).find((toolkitSlug) =>
    toolkitToolPrefixes(toolkitSlug).some((prefix) =>
      normalizedToolName.startsWith(normalizedToken(prefix))
    )
  )
}

function observedTool(step: RunStep): {
  toolkitSlug?: string
  toolName?: string
} {
  const toolName =
    payloadString(step.payload, "toolSlug") ??
    payloadString(step.payload, "toolName") ??
    payloadString(step.payload, "tool")
  return {
    toolkitSlug:
      payloadString(step.payload, "toolkitSlug") ?? toolkitFromToolName(toolName),
    toolName,
  }
}

function isSupportedToolkit(toolkitSlug: string): boolean {
  return toolkitSlug in CURATED_COMPOSIO_TOOLS
}

function displayName(toolkitSlug: string, toolName: string | undefined): string {
  const toolkitName = SUPPORTED_TOOLKIT_NAMES[toolkitSlug] ?? toolkitSlug
  if (!toolName) return toolkitName

  const suffix = toolkitToolPrefixes(toolkitSlug).reduce(
    (current, prefix) => current.replace(new RegExp(`^${prefix}`, "i"), ""),
    toolName
  )
  const words = suffix.toLowerCase().split("_").filter(Boolean).join(" ")
  return words ? `${toolkitName} ${words}` : toolkitName
}

function proposedGrant(
  toolkitSlug: string,
  toolName: string | undefined
): AgentPromotionDraftToolGrantProposal {
  return {
    toolkitSlug,
    toolName,
    displayName: displayName(toolkitSlug, toolName),
    required: true,
  }
}

function isToolStep(step: RunStep): boolean {
  return step.type === "tool-call" || step.type === "tool-result"
}

export function analyzeThreadToolUsage({
  steps,
}: AnalyzeThreadToolUsageInput): {
  proposedToolGrants: AgentPromotionDraftToolGrantProposal[]
  unsupportedSourceSteps: UnsupportedSourceStep[]
} {
  const proposedByToolkit = new Map<string, AgentPromotionDraftToolGrantProposal>()
  const unsupportedSourceSteps: UnsupportedSourceStep[] = []

  for (const step of steps.filter(isToolStep)) {
    const { toolkitSlug, toolName } = observedTool(step)
    if (!toolkitSlug) {
      unsupportedSourceSteps.push({
        id: step.id,
        title: step.title,
        reason: "missing_metadata",
        details: "The source step did not include a toolkit.",
      })
      continue
    }

    if (!isSupportedToolkit(toolkitSlug)) {
      unsupportedSourceSteps.push({
        id: step.id,
        title: step.title,
        reason: "unsupported_tool",
        toolName,
        details: "No matching integration is available for this source step.",
      })
      continue
    }

    if (!proposedByToolkit.has(toolkitSlug)) {
      proposedByToolkit.set(toolkitSlug, proposedGrant(toolkitSlug, toolName))
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
