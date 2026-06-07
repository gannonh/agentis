import { tool } from "ai"
import {
  createAppInputSchema,
  editAppInputSchema,
  findAppsInputSchema,
} from "@workspace/shared"
import type { AppService } from "./app-service.js"

function errorPayload(error: {
  code: string
  message: string
  remediation?: string
}) {
  return {
    action: "failed",
    error: error.message,
    code: error.code,
    remediation: error.remediation ?? remediationFor(error.code),
  }
}

function remediationFor(code: string): string {
  switch (code) {
    case "app_invalid_bundle":
      return "Remove external scripts, inline event handlers, iframe creation, and parent page access from the bundle."
    case "app_bundle_too_large":
      return "Reduce HTML, CSS, or JavaScript size before creating the App."
    case "app_permission_denied":
      return "Enable the apps native tool permission for this agent."
    default:
      return "Review the App request and try again."
  }
}

function timelineOutput(action: "created" | "edited" | "found", output: unknown) {
  if (typeof output !== "object" || output === null) return { action }
  return { action, ...(output as Record<string, unknown>) }
}

export function buildAppTools(
  appService: AppService,
  context: {
    runId: string
    threadId: string
    projectId?: string
    onEvidence?: (title: string, payload: Record<string, unknown>) => void
  }
) {
  const runContext = {
    runId: context.runId,
    threadId: context.threadId,
    projectId: context.projectId,
  }

  return {
    createApp: tool({
      description:
        "Create a durable interactive App Artifact with mutable state linked to the current run and Library. Use for calculators, forms, trackers, and other interactive tools — not static webpages or slide decks.",
      inputSchema: createAppInputSchema,
      execute: async (input) => {
        const result = appService.createApp({
          ...input,
          projectId: context.projectId,
          threadId: context.threadId,
          runId: context.runId,
        })
        if (!result.ok) {
          const payload = errorPayload(result)
          context.onEvidence?.("App failed", payload)
          return payload
        }
        const payload = timelineOutput("created", result.output)
        context.onEvidence?.(`App created: ${result.output.title}`, payload)
        return result.output
      },
    }),

    editApp: tool({
      description:
        "Edit an existing App Artifact by creating a new immutable version while preserving prior versions.",
      inputSchema: editAppInputSchema,
      execute: async (input) => {
        const result = appService.editApp({
          ...input,
          runContext,
        })
        if (!result.ok) {
          const payload = errorPayload(result)
          context.onEvidence?.("App failed", payload)
          return payload
        }
        const payload = timelineOutput("edited", result.output)
        context.onEvidence?.(`App edited: ${result.output.title}`, payload)
        return result.output
      },
    }),

    findApps: tool({
      description:
        "Find accessible App Artifacts before editing or referencing them.",
      inputSchema: findAppsInputSchema,
      execute: async (input) => {
        const result = appService.findApps({
          ...input,
          runContext,
        })
        if (!result.ok) {
          const payload = errorPayload(result)
          context.onEvidence?.("App failed", payload)
          return payload
        }
        const payload = timelineOutput("found", {
          query: input.query,
          resultCount: result.output.resultCount,
          truncated: result.output.truncated,
          items: result.output.items.slice(0, 10),
        })
        context.onEvidence?.("Searched apps", payload)
        return result.output
      },
    }),
  }
}
