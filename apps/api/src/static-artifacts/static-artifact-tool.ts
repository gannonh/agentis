import { tool } from "ai"
import {
  createStaticArtifactInputSchema,
  editStaticArtifactInputSchema,
  findStaticArtifactsInputSchema,
  readStaticArtifactInputSchema,
} from "@workspace/shared"
import type { StaticArtifactService } from "./static-artifact-service.js"

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
    case "static_artifact_invalid_render_mode":
      return "Use html for webpages or polishedImage only for slides."
    case "static_artifact_provider_unavailable":
      return "Configure an image generation provider or use html render mode."
    case "static_artifact_invalid_html":
      return "Remove runtime calls, external scripts, event handlers, browser storage access, and unapproved network dependencies."
    case "static_artifact_bundle_too_large":
      return "Reduce HTML, CSS, JavaScript, or asset size before creating the artifact."
    default:
      return "Review the static artifact request and try again."
  }
}

function timelineOutput(action: "created" | "edited" | "found" | "read", output: unknown) {
  if (typeof output !== "object" || output === null) return { action }
  return { action, ...(output as Record<string, unknown>) }
}

export function buildStaticArtifactTools(
  staticArtifactService: StaticArtifactService,
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
    createStaticArtifact: tool({
      description:
        "Create a durable static webpage or slide deck Artifact linked to the current run and Library. For HTML slide decks, use generatedHtml when the user asks for a full presentation or detailed slide content; use contentBrief-only outlines only when outline/title slides satisfy the request.",
      inputSchema: createStaticArtifactInputSchema,
      execute: async (input) => {
        const result = staticArtifactService.createStaticArtifact({
          ...input,
          projectId: context.projectId,
          threadId: context.threadId,
          runId: context.runId,
        })
        if (!result.ok) return errorPayload(result)
        const payload = timelineOutput("created", result.output)
        context.onEvidence?.(
          `Static artifact created: ${result.output.title}`,
          payload
        )
        return result.output
      },
    }),

    editStaticArtifact: tool({
      description:
        "Edit an existing static webpage or slide deck Artifact by creating a new version. When adding detail to an HTML slide deck, provide complete generatedHtml with substantive body content on the affected slides instead of only changing contentBrief; leave title-only slides only when the user asks for an outline.",
      inputSchema: editStaticArtifactInputSchema,
      execute: async (input) => {
        const result = staticArtifactService.editStaticArtifact({
          ...input,
          runContext,
        })
        if (!result.ok) return errorPayload(result)
        const payload = timelineOutput("edited", result.output)
        context.onEvidence?.(
          `Static artifact edited: ${result.output.title}`,
          payload
        )
        return result.output
      },
    }),

    findStaticArtifacts: tool({
      description:
        "Find accessible static webpage and slide deck Artifacts before editing or referencing them.",
      inputSchema: findStaticArtifactsInputSchema,
      execute: async (input) => {
        const result = staticArtifactService.findStaticArtifacts({
          ...input,
          runContext,
        })
        if (!result.ok) return errorPayload(result)
        const payload = timelineOutput("found", {
          query: input.query,
          resultCount: result.output.resultCount,
          truncated: result.output.truncated,
          items: result.output.items.slice(0, 10),
        })
        context.onEvidence?.("Searched static artifacts", payload)
        return result.output
      },
    }),

    readStaticArtifact: tool({
      description:
        "Read the exact stored text content and metadata for an accessible static artifact. Use this before answering questions about what an existing artifact actually contains.",
      inputSchema: readStaticArtifactInputSchema,
      execute: async (input) => {
        const result = staticArtifactService.readStaticArtifact({
          ...input,
          runContext,
        })
        if (!result.ok) return errorPayload(result)
        const payload = timelineOutput("read", result.output)
        context.onEvidence?.(`Static artifact read: ${result.output.title}`, payload)
        return result.output
      },
    }),
  }
}
