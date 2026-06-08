import { describe, expect, it } from "vitest"
import { createTestContext } from "../test/setup.js"
import { DocumentService } from "../documents/document-service.js"
import { finalizeResearchBriefIfNeeded } from "./research-brief-finalizer.js"

describe("finalizeResearchBriefIfNeeded", () => {
  it("creates a research brief document from searchWeb tool results", () => {
    const ctx = createTestContext()
    const documentService = new DocumentService(ctx.repos, ctx.config)
    const thread = ctx.repos.threads.create({
      title: "Research SMB AI agents",
      model: "openai/gpt-5.4-mini",
      mode: "agent",
    })
    const run = ctx.repos.runs.create({
      threadId: thread.id,
      model: thread.model,
      status: "running",
    })
    const prompt =
      "Research AI agent adoption and create a markdown research brief with citations."

    const { assistantParts, created } = finalizeResearchBriefIfNeeded({
      repos: ctx.repos,
      documentService,
      thread,
      runId: run.id,
      latestUserPrompt: prompt,
      assistantParts: [
        {
          type: "text",
          text: '{"query":"ai agents","provider":"tavily:keyless","results":[]}',
        },
        {
          type: "tool-result",
          toolCallId: "call_1",
          toolName: "searchWeb",
          output: {
            query: "small business AI agents 2026",
            provider: "tavily:keyless",
            results: [
              {
                title: "SMB AI adoption report",
                url: "https://example.com/report",
                snippet: "Adoption is rising quickly.",
              },
            ],
            resultCount: 1,
            truncated: false,
          },
        },
      ],
    })

    expect(created).toBe(true)
    expect(assistantParts[0]).toMatchObject({
      type: "text",
      text: expect.stringContaining("saved a research brief"),
    })
    expect(ctx.repos.documents.list({ threadId: thread.id })).toEqual([
      expect.objectContaining({
        title: expect.stringMatching(/Research brief/i),
        runId: run.id,
      }),
    ])
  })

  it("still creates a brief when createDocument failed with an error tool-result", () => {
    const ctx = createTestContext()
    const documentService = new DocumentService(ctx.repos, ctx.config)
    const thread = ctx.repos.threads.create({
      title: "Research SMB AI agents",
      model: "openai/gpt-5.4-mini",
      mode: "agent",
    })
    const run = ctx.repos.runs.create({
      threadId: thread.id,
      model: thread.model,
      status: "running",
    })

    const { created } = finalizeResearchBriefIfNeeded({
      repos: ctx.repos,
      documentService,
      thread,
      runId: run.id,
      latestUserPrompt:
        "Research AI agent adoption and create a markdown research brief.",
      assistantParts: [
        {
          type: "tool-result",
          toolCallId: "call_doc",
          toolName: "createDocument",
          output: { error: "Document title already exists", code: "conflict" },
        },
        {
          type: "tool-result",
          toolCallId: "call_1",
          toolName: "searchWeb",
          output: {
            query: "small business AI agents 2026",
            provider: "tavily:keyless",
            results: [
              {
                title: "SMB AI adoption report",
                url: "https://example.com/report",
                snippet: "Adoption is rising quickly.",
              },
            ],
            resultCount: 1,
            truncated: false,
          },
        },
      ],
    })

    expect(created).toBe(true)
    expect(ctx.repos.documents.list({ threadId: thread.id })).toHaveLength(1)
  })

  it("skips when createDocument already succeeded", () => {
    const ctx = createTestContext()
    const documentService = new DocumentService(ctx.repos, ctx.config)
    const thread = ctx.repos.threads.create({
      title: "Research SMB AI agents",
      model: "openai/gpt-5.4-mini",
      mode: "agent",
    })
    const run = ctx.repos.runs.create({
      threadId: thread.id,
      model: thread.model,
      status: "running",
    })

    const result = finalizeResearchBriefIfNeeded({
      repos: ctx.repos,
      documentService,
      thread,
      runId: run.id,
      latestUserPrompt:
        "Research AI agent adoption and create a markdown research brief.",
      assistantParts: [
        {
          type: "tool-result",
          toolCallId: "call_doc",
          toolName: "createDocument",
          output: { documentId: "document_existing" },
        },
      ],
    })

    expect(result.created).toBe(false)
    expect(ctx.repos.documents.list({ threadId: thread.id })).toEqual([])
  })
})
