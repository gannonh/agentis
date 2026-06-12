import { afterEach, describe, expect, it } from "vitest"
import { acceptLearningSuggestion } from "./learning-suggestion-service.js"
import {
  syncPendingLearningSuggestions,
  isSuggestionSupersededByMemory,
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
