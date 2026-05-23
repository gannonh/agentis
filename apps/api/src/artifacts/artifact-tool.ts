import { tool } from "ai"
import { z } from "zod"
import { artifactTypeSchema } from "@workspace/shared"
import type { ArtifactService } from "./artifact-service.js"

export function createArtifactTool(
  artifactService: ArtifactService,
  context: {
    runId: string
    threadId: string
    projectId?: string
    onCreated?: (artifactId: string, title: string) => void
  }
) {
  return tool({
    description:
      "Create a durable text artifact (document, brief, or report) linked to the current run and library.",
    inputSchema: z.object({
      title: z.string().min(1),
      type: artifactTypeSchema.default("document"),
      description: z.string().optional(),
      filename: z.string().min(1),
      content: z.string().min(1),
      previewText: z.string().optional(),
    }),
    execute: async (input) => {
      const result = artifactService.registerGenerated({
        title: input.title,
        description: input.description,
        type: input.type,
        filename: input.filename,
        content: input.content,
        previewText: input.previewText,
        projectId: context.projectId,
        threadId: context.threadId,
        runId: context.runId,
      })
      if (!result.ok) {
        return { error: result.message, code: result.code }
      }
      context.onCreated?.(result.artifact.id, result.artifact.title)
      return {
        artifactId: result.artifact.id,
        title: result.artifact.title,
        downloadPath: `/api/artifacts/${result.artifact.id}/download`,
      }
    },
  })
}
