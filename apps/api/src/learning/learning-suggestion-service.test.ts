import { afterEach, describe, expect, it, vi } from "vitest"
import { acceptLearningSuggestion } from "./learning-suggestion-service.js"
import { createTestContext, type TestContext } from "../test/setup.js"

let ctx: TestContext | undefined

afterEach(() => {
  ctx?.cleanup()
  ctx = undefined
  vi.restoreAllMocks()
})

describe("acceptLearningSuggestion", () => {
  it("does not create a saved memory when status update fails", () => {
    ctx = createTestContext()
    const agent = ctx.repos.agents.create({
      name: "Research Agent",
      systemPrompt: "Research.",
      model: "gpt-4o-mini",
    })
    const thread = ctx.repos.threads.create({
      title: "Preference capture",
      model: "gpt-4o-mini",
      mode: "agent",
      agentId: agent.id,
      agentNameSnapshot: agent.name,
    })
    const suggestion = ctx.repos.learningSuggestions.create({
      suggestionType: "memory",
      title: "Capture preference",
      content: "Prefer concise summaries.",
      sourceThreadId: thread.id,
      sourceThreadTitle: thread.title,
      agentId: agent.id,
    })

    const memoryCountBefore = ctx.repos.savedMemories.count()
    vi.spyOn(ctx.repos.learningSuggestions, "updateStatus").mockReturnValue(null)

    const result = acceptLearningSuggestion(ctx.repos, suggestion.id)

    expect(result).toBeNull()
    expect(ctx.repos.savedMemories.count()).toBe(memoryCountBefore)
  })

  it("does not create a skill when status update fails", () => {
    ctx = createTestContext()
    const agent = ctx.repos.agents.create({
      name: "Skill Agent",
      systemPrompt: "Build skills.",
      model: "gpt-4o-mini",
    })
    const thread = ctx.repos.threads.create({
      title: "Skill capture",
      model: "gpt-4o-mini",
      mode: "agent",
      agentId: agent.id,
      agentNameSnapshot: agent.name,
    })
    const suggestion = ctx.repos.learningSuggestions.create({
      suggestionType: "skill",
      title: "Summarize docs",
      content: "Summarize long docs into bullet points.",
      sourceThreadId: thread.id,
      sourceThreadTitle: thread.title,
      agentId: agent.id,
    })

    const skillCountBefore = ctx.repos.skills.count()
    vi.spyOn(ctx.repos.learningSuggestions, "updateStatus").mockReturnValue(null)

    const result = acceptLearningSuggestion(ctx.repos, suggestion.id)

    expect(result).toBeNull()
    expect(ctx.repos.skills.count()).toBe(skillCountBefore)
  })
})
