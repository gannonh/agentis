import { afterEach, describe, expect, it } from "vitest"
import { acceptLearningSuggestion } from "./learning-suggestion-service.js"
import {
  syncPendingLearningSuggestions,
  isSuggestionSupersededByMemory,
  filterVisiblePendingSuggestions,
} from "./suggestion-consistency.js"
import { maybeGenerateLearningSuggestions } from "../runtime/learning-suggestion-generator.js"
import { createTestContext, type TestContext } from "../test/setup.js"

let ctx: TestContext | undefined

afterEach(() => {
  ctx?.cleanup()
  ctx = undefined
})

describe("suggestion consistency", () => {
  it("does not create duplicate pending suggestions for the same thread content", () => {
    ctx = createTestContext()
    const agent = ctx.repos.agents.create({
      name: "Research Agent",
      systemPrompt: "Research.",
      model: "gpt-4o-mini",
    })
    const thread = ctx.repos.threads.create({
      title: "UAT eval run 1",
      model: "gpt-4o-mini",
      mode: "agent",
      agentId: agent.id,
      agentNameSnapshot: agent.name,
    })
    const run = ctx.repos.runs.create({
      threadId: thread.id,
      model: "gpt-4o-mini",
      agentId: agent.id,
    })

    const input = {
      repos: ctx.repos,
      mockRuntime: false,
      run,
      thread,
      latestUserPrompt: "UAT eval run 1",
      assistantParts: [
        {
          type: "text" as const,
          text: "Conversation takeaway: Workspace has 1 thread active and 3 items need attention.",
        },
      ],
    }

    maybeGenerateLearningSuggestions(input)
    maybeGenerateLearningSuggestions(input)

    expect(ctx.repos.learningSuggestions.countPending()).toBe(1)
  })

  it("heals stale pending suggestions when a matching saved memory already exists", () => {
    ctx = createTestContext()
    const agent = ctx.repos.agents.create({
      name: "Research Agent",
      systemPrompt: "Research.",
      model: "gpt-4o-mini",
    })
    const thread = ctx.repos.threads.create({
      title: "UAT eval run 1",
      model: "gpt-4o-mini",
      mode: "agent",
      agentId: agent.id,
      agentNameSnapshot: agent.name,
    })
    const content =
      "Conversation takeaway: Workspace has 1 thread active and 3 items need attention."

    ctx.repos.savedMemories.createFromThread({
      content,
      category: "memory_category_preference",
      importance: "medium",
      usageGuidance: "Use when working on follow-up tasks from the source thread.",
      tags: [],
      scope: "agent",
      associatedAgent: agent.id,
      sourceThreadId: thread.id,
      sourceThreadTitle: thread.title,
      pinnedToContext: true,
    })

    const suggestion = ctx.repos.learningSuggestions.create({
      suggestionType: "memory",
      title: "Review conversation insight",
      content,
      sourceThreadId: thread.id,
      sourceThreadTitle: thread.title,
      agentId: agent.id,
    })

    expect(isSuggestionSupersededByMemory(ctx.repos, suggestion)).toBe(true)
    expect(syncPendingLearningSuggestions(ctx.repos)).toBe(1)
    expect(ctx.repos.learningSuggestions.getById(suggestion.id)?.status).toBe(
      "accepted"
    )
    expect(ctx.repos.learningSuggestions.countPending()).toBe(0)
  })

  it("filters superseded pending suggestions without mutating status", () => {
    ctx = createTestContext()
    const agent = ctx.repos.agents.create({
      name: "Research Agent",
      systemPrompt: "Research.",
      model: "gpt-4o-mini",
    })
    const thread = ctx.repos.threads.create({
      title: "UAT eval run 1",
      model: "gpt-4o-mini",
      mode: "agent",
      agentId: agent.id,
      agentNameSnapshot: agent.name,
    })
    const content =
      "Conversation takeaway: Workspace has 1 thread active and 3 items need attention."

    ctx.repos.savedMemories.createFromThread({
      content,
      category: "memory_category_preference",
      importance: "medium",
      usageGuidance: "Use when working on follow-up tasks from the source thread.",
      tags: [],
      scope: "agent",
      associatedAgent: agent.id,
      sourceThreadId: thread.id,
      sourceThreadTitle: thread.title,
      pinnedToContext: true,
    })

    const suggestion = ctx.repos.learningSuggestions.create({
      suggestionType: "memory",
      title: "Review conversation insight",
      content,
      sourceThreadId: thread.id,
      sourceThreadTitle: thread.title,
      agentId: agent.id,
    })

    const visible = filterVisiblePendingSuggestions(ctx.repos, [suggestion])
    expect(visible).toEqual([])
    expect(ctx.repos.learningSuggestions.getById(suggestion.id)?.status).toBe(
      "pending"
    )
  })

  it("sync dismisses duplicate pending suggestions when healing stale rows", () => {
    ctx = createTestContext()
    const agent = ctx.repos.agents.create({
      name: "Research Agent",
      systemPrompt: "Research.",
      model: "gpt-4o-mini",
    })
    const thread = ctx.repos.threads.create({
      title: "UAT eval run 1",
      model: "gpt-4o-mini",
      mode: "agent",
      agentId: agent.id,
      agentNameSnapshot: agent.name,
    })
    const content =
      "Conversation takeaway: Workspace has 1 thread active and 3 items need attention."

    ctx.repos.savedMemories.createFromThread({
      content,
      category: "memory_category_preference",
      importance: "medium",
      usageGuidance: "Use when working on follow-up tasks from the source thread.",
      tags: [],
      scope: "agent",
      associatedAgent: agent.id,
      sourceThreadId: thread.id,
      sourceThreadTitle: thread.title,
      pinnedToContext: true,
    })

    const first = ctx.repos.learningSuggestions.create({
      suggestionType: "memory",
      title: "Review conversation insight",
      content,
      sourceThreadId: thread.id,
      sourceThreadTitle: thread.title,
      agentId: agent.id,
    })
    const duplicate = ctx.repos.learningSuggestions.create({
      suggestionType: "memory",
      title: "Review conversation insight",
      content,
      sourceThreadId: thread.id,
      sourceThreadTitle: thread.title,
      agentId: agent.id,
    })

    expect(syncPendingLearningSuggestions(ctx.repos)).toBe(2)
    expect(ctx.repos.learningSuggestions.getById(first.id)?.status).toBe(
      "accepted"
    )
    expect(ctx.repos.learningSuggestions.getById(duplicate.id)?.status).toBe(
      "dismissed"
    )
    expect(ctx.repos.learningSuggestions.countPending()).toBe(0)
  })

  it("sync heals stale suggestions beyond the first pending page", () => {
    ctx = createTestContext()
    const agent = ctx.repos.agents.create({
      name: "Research Agent",
      systemPrompt: "Research.",
      model: "gpt-4o-mini",
    })
    const thread = ctx.repos.threads.create({
      title: "UAT eval run 1",
      model: "gpt-4o-mini",
      mode: "agent",
      agentId: agent.id,
      agentNameSnapshot: agent.name,
    })
    const staleContent = "Conversation takeaway: stale row on page two."

    ctx.repos.savedMemories.createFromThread({
      content: staleContent,
      category: "memory_category_preference",
      importance: "medium",
      usageGuidance: "Use when working on follow-up tasks from the source thread.",
      tags: [],
      scope: "agent",
      associatedAgent: agent.id,
      sourceThreadId: thread.id,
      sourceThreadTitle: thread.title,
      pinnedToContext: true,
    })

    for (let index = 0; index < 100; index += 1) {
      ctx.repos.learningSuggestions.create({
        suggestionType: "memory",
        title: `Fresh pending ${index}`,
        content: `Fresh takeaway ${index}`,
        sourceThreadId: thread.id,
        sourceThreadTitle: thread.title,
        agentId: agent.id,
      })
    }

    const stale = ctx.repos.learningSuggestions.create({
      suggestionType: "memory",
      title: "Stale pending",
      content: staleContent,
      sourceThreadId: thread.id,
      sourceThreadTitle: thread.title,
      agentId: agent.id,
    })

    expect(syncPendingLearningSuggestions(ctx.repos)).toBe(1)
    expect(ctx.repos.learningSuggestions.getById(stale.id)?.status).toBe(
      "accepted"
    )
    expect(ctx.repos.learningSuggestions.countPending()).toBe(100)
  })

  it("accept creates a new memory when edited content differs from saved memory", () => {
    ctx = createTestContext()
    const agent = ctx.repos.agents.create({
      name: "Research Agent",
      systemPrompt: "Research.",
      model: "gpt-4o-mini",
    })
    const thread = ctx.repos.threads.create({
      title: "UAT eval run 1",
      model: "gpt-4o-mini",
      mode: "agent",
      agentId: agent.id,
      agentNameSnapshot: agent.name,
    })
    const originalContent =
      "Conversation takeaway: Workspace has 1 thread active and 3 items need attention."
    const editedContent = `${originalContent} Edited on accept.`

    const existing = ctx.repos.savedMemories.createFromThread({
      content: originalContent,
      category: "memory_category_preference",
      importance: "medium",
      usageGuidance: "Use when working on follow-up tasks from the source thread.",
      tags: [],
      scope: "agent",
      associatedAgent: agent.id,
      sourceThreadId: thread.id,
      sourceThreadTitle: thread.title,
      pinnedToContext: true,
    })

    const suggestion = ctx.repos.learningSuggestions.create({
      suggestionType: "memory",
      title: "Review conversation insight",
      content: originalContent,
      sourceThreadId: thread.id,
      sourceThreadTitle: thread.title,
      agentId: agent.id,
    })

    const result = acceptLearningSuggestion(ctx.repos, suggestion.id, {
      content: editedContent,
    })

    expect(result?.savedMemoryId).not.toBe(existing.id)
    expect(ctx.repos.savedMemories.getById(result?.savedMemoryId ?? "")?.content).toBe(
      editedContent
    )
  })

  it("dismisses duplicate pending suggestions when one is accepted", () => {
    ctx = createTestContext()
    const agent = ctx.repos.agents.create({
      name: "Research Agent",
      systemPrompt: "Research.",
      model: "gpt-4o-mini",
    })
    const thread = ctx.repos.threads.create({
      title: "UAT eval run 1",
      model: "gpt-4o-mini",
      mode: "agent",
      agentId: agent.id,
      agentNameSnapshot: agent.name,
    })
    const content =
      "Conversation takeaway: Workspace has 1 thread active and 3 items need attention."

    const first = ctx.repos.learningSuggestions.create({
      suggestionType: "memory",
      title: "Review conversation insight",
      content,
      sourceThreadId: thread.id,
      sourceThreadTitle: thread.title,
      agentId: agent.id,
    })
    const duplicate = ctx.repos.learningSuggestions.create({
      suggestionType: "memory",
      title: "Review conversation insight",
      content,
      sourceThreadId: thread.id,
      sourceThreadTitle: thread.title,
      agentId: agent.id,
    })

    const result = acceptLearningSuggestion(ctx.repos, first.id)
    expect(result?.savedMemoryId).toBeTruthy()
    expect(ctx.repos.learningSuggestions.getById(first.id)?.status).toBe(
      "accepted"
    )
    expect(ctx.repos.learningSuggestions.getById(duplicate.id)?.status).toBe(
      "dismissed"
    )
    expect(ctx.repos.learningSuggestions.countPending()).toBe(0)
  })
})
