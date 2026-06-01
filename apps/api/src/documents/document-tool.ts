import { tool } from "ai"
import { z } from "zod"
import {
  documentTypeSchema,
  documentVisibilityScopeSchema,
} from "@workspace/shared"
import type { DocumentService } from "./document-service.js"

const runContextSchema = z.object({}).optional()

export function buildDocumentTools(
  documentService: DocumentService,
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
    createDocument: tool({
      description:
        "Create a durable text document in markdown linked to the current run and Library.",
      inputSchema: z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        content: z.string().min(1),
        visibilityScope: documentVisibilityScopeSchema.default("thread"),
        tags: z.array(z.string()).optional(),
        changeSummary: z.string().optional(),
      }),
      execute: async (input) => {
        const result = documentService.createMarkdownDocument({
          title: input.title,
          description: input.description,
          content: input.content,
          visibilityScope: input.visibilityScope,
          tags: input.tags,
          changeSummary: input.changeSummary,
          projectId:
            input.visibilityScope === "project" ? context.projectId : undefined,
          threadId: context.threadId,
          runId: context.runId,
        })
        if (!result.ok) return { error: result.message, code: result.code }
        const payload = {
          documentId: result.document.id,
          title: result.document.title,
          visibilityScope: result.document.visibilityScope,
          currentVersion: result.currentVersion,
          viewPath: `/library?documentId=${result.document.id}`,
          previewText: result.document.previewText,
        }
        context.onEvidence?.(`Document created: ${result.document.title}`, payload)
        return payload
      },
    }),

    findDocuments: tool({
      description: "Find accessible persistent documents before creating or updating durable knowledge.",
      inputSchema: z.object({
        query: z.string().optional(),
        visibilityScope: documentVisibilityScopeSchema.optional(),
        documentType: documentTypeSchema.optional(),
        projectId: z.string().optional(),
        limit: z.number().int().positive().max(50).optional(),
        runContext: runContextSchema,
      }),
      execute: async (input) => {
        const documents = documentService.findDocuments({
          query: input.query,
          visibilityScope: input.visibilityScope,
          documentType: input.documentType,
          projectId: input.projectId,
          limit: input.limit,
          runContext,
        })
        const results = documents.map((document) => ({
          id: document.id,
          title: document.title,
          description: document.description,
          visibilityScope: document.visibilityScope,
          documentType: document.documentType,
          projectId: document.projectId,
          projectNameSnapshot: document.projectNameSnapshot,
          threadId: document.threadId,
          threadTitleSnapshot: document.threadTitleSnapshot,
          updatedAt: document.updatedAt,
          previewText: document.previewText,
          currentVersion: document.currentVersion,
        }))
        context.onEvidence?.("Searched documents", {
          query: input.query,
          count: results.length,
          results: results.slice(0, 10),
        })
        return { results }
      },
    }),

    readDocument: tool({
      description: "Read an accessible persistent markdown document with bounded content and section outline.",
      inputSchema: z.object({
        documentId: z.string().min(1),
        version: z.number().int().positive().optional(),
        runContext: runContextSchema,
      }),
      execute: async (input) => {
        const result = documentService.readDocument({
          documentId: input.documentId,
          version: input.version,
          runContext,
        })
        if (!result.ok) return { error: result.message, code: result.code }
        const output = {
          metadata: {
            id: result.document.id,
            title: result.document.title,
            description: result.document.description,
            visibilityScope: result.document.visibilityScope,
            documentType: result.document.documentType,
            currentVersion: result.currentVersion,
          },
          content: result.content,
          truncated: result.truncated,
          maxChars: result.maxChars,
          sectionOutline: result.outline.map((section) => ({
            heading: section.heading,
            level: section.level,
            path: section.path,
          })),
        }
        context.onEvidence?.(`Read document: ${result.document.title}`, {
          documentId: result.document.id,
          title: result.document.title,
          currentVersion: result.currentVersion,
          truncated: result.truncated,
          previewText: result.document.previewText,
        })
        return output
      },
    }),

    updateDocumentSection: tool({
      description: "Update exactly one existing markdown section in an accessible document.",
      inputSchema: z.object({
        documentId: z.string().min(1),
        sectionPath: z.string().min(1),
        content: z.string().min(1),
        changeSummary: z.string().optional(),
        runContext: runContextSchema,
      }),
      execute: async (input) => {
        const result = documentService.updateDocumentSection({
          documentId: input.documentId,
          sectionPath: input.sectionPath,
          content: input.content,
          changeSummary: input.changeSummary,
          runContext,
        })
        if (!result.ok) return { error: result.message, code: result.code }
        const payload = {
          documentId: result.document.id,
          title: result.document.title,
          previousVersion: result.previousVersion,
          currentVersion: result.currentVersion,
          sectionPath: result.section.path,
          previewText: result.document.previewText,
        }
        context.onEvidence?.(`Updated document section: ${result.document.title}`, payload)
        return payload
      },
    }),

    appendDocumentSection: tool({
      description: "Append markdown content or add a section to an accessible document.",
      inputSchema: z.object({
        documentId: z.string().min(1),
        heading: z.string().optional(),
        parentSectionPath: z.string().optional(),
        content: z.string().min(1),
        changeSummary: z.string().optional(),
        runContext: runContextSchema,
      }),
      execute: async (input) => {
        const result = documentService.appendDocumentSection({
          documentId: input.documentId,
          heading: input.heading,
          parentSectionPath: input.parentSectionPath,
          content: input.content,
          changeSummary: input.changeSummary,
          runContext,
        })
        if (!result.ok) return { error: result.message, code: result.code }
        const payload = {
          documentId: result.document.id,
          title: result.document.title,
          previousVersion: result.previousVersion,
          currentVersion: result.currentVersion,
          sectionPath: result.section.path,
          previewText: result.document.previewText,
        }
        context.onEvidence?.(`Appended document section: ${result.document.title}`, payload)
        return payload
      },
    }),
  }
}
