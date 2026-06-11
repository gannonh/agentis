import { afterEach, describe, expect, it } from "vitest"
import { createApp } from "../app.js"
import { createTestContext, type TestContext } from "../test/setup.js"

let ctx: TestContext | undefined

afterEach(() => {
  ctx?.cleanup()
  ctx = undefined
})

describe("learning routes", () => {
  const SEEDED_MEMORY_COUNT = 3

  it("returns zero counts for new learning entities on a fresh install", async () => {
    ctx = createTestContext()
    const app = createApp(ctx.repos, ctx.config)

    const response = await app.request("/api/learning/summary")
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      skillsCount: 0,
      pinnedSkillsCount: 0,
      memoriesCount: SEEDED_MEMORY_COUNT,
      rubricsCount: 0,
      pendingSuggestionsCount: 0,
    })
  })

  it("lists skills with pagination and updates summary after create", async () => {
    ctx = createTestContext()
    const app = createApp(ctx.repos, ctx.config)

    const emptySkills = await app.request("/api/learning/skills")
    expect(emptySkills.status).toBe(200)
    expect(await emptySkills.json()).toEqual({
      skills: [],
      page: 1,
      pageSize: 20,
      totalCount: 0,
      totalPages: 0,
    })

    const createResponse = await app.request("/api/learning/skills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "website-to-hyperframes", pinned: true }),
    })
    expect(createResponse.status).toBe(201)
    const created = (await createResponse.json()) as {
      id: string
      name: string
      pinned: boolean
    }
    expect(created.name).toBe("website-to-hyperframes")
    expect(created.pinned).toBe(true)

    const summaryResponse = await app.request("/api/learning/summary")
    expect(await summaryResponse.json()).toMatchObject({
      skillsCount: 1,
      pinnedSkillsCount: 1,
      memoriesCount: SEEDED_MEMORY_COUNT,
      rubricsCount: 0,
      pendingSuggestionsCount: 0,
    })

    const listResponse = await app.request("/api/learning/skills?page=1&pageSize=5")
    expect(listResponse.status).toBe(200)
    const listBody = (await listResponse.json()) as {
      totalCount: number
      skills: Array<{ name: string }>
    }
    expect(listBody.totalCount).toBe(1)
    expect(listBody.skills).toHaveLength(1)
    expect(listBody.skills[0].name).toBe("website-to-hyperframes")
  })

  it("returns null descriptions for blank skill descriptions", async () => {
    ctx = createTestContext()
    const app = createApp(ctx.repos, ctx.config)

    const createResponse = await app.request("/api/learning/skills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "blank-description-skill",
        description: "   ",
      }),
    })
    expect(createResponse.status).toBe(201)
    expect(await createResponse.json()).toMatchObject({
      name: "blank-description-skill",
      description: null,
    })
  })

  it("returns paginated memories and rubrics lists", async () => {
    ctx = createTestContext()
    const app = createApp(ctx.repos, ctx.config)

    const memoriesResponse = await app.request("/api/learning/memories?page=1&pageSize=10")
    expect(memoriesResponse.status).toBe(200)
    const memoriesBody = (await memoriesResponse.json()) as {
      memories: unknown[]
      page: number
      pageSize: number
      totalCount: number
      totalPages: number
    }
    expect(memoriesBody).toMatchObject({
      page: 1,
      pageSize: 10,
      totalCount: SEEDED_MEMORY_COUNT,
      totalPages: 1,
    })
    expect(memoriesBody.memories).toHaveLength(SEEDED_MEMORY_COUNT)

    const rubricsResponse = await app.request("/api/learning/rubrics?page=1&pageSize=10")
    expect(rubricsResponse.status).toBe(200)
    expect(await rubricsResponse.json()).toEqual({
      rubrics: [],
      page: 1,
      pageSize: 10,
      totalCount: 0,
      totalPages: 0,
    })
  })

  it("returns client errors for invalid learning inputs", async () => {
    ctx = createTestContext()
    const app = createApp(ctx.repos, ctx.config)

    const invalidSkillsQuery = await app.request("/api/learning/skills?page=abc")
    expect(invalidSkillsQuery.status).toBe(400)
    expect(await invalidSkillsQuery.json()).toMatchObject({
      code: "invalid_learning_query",
    })

    const invalidMemoriesQuery = await app.request(
      "/api/learning/memories?category=not-a-category"
    )
    expect(invalidMemoriesQuery.status).toBe(400)
    expect(await invalidMemoriesQuery.json()).toMatchObject({
      code: "invalid_learning_query",
    })

    const invalidRubricsQuery = await app.request("/api/learning/rubrics?pageSize=0")
    expect(invalidRubricsQuery.status).toBe(400)
    expect(await invalidRubricsQuery.json()).toMatchObject({
      code: "invalid_learning_query",
    })

    const invalidCreate = await app.request("/api/learning/skills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "" }),
    })
    expect(invalidCreate.status).toBe(400)
    expect(await invalidCreate.json()).toMatchObject({
      code: "invalid_learning_payload",
    })

    const invalidAgentId = await app.request("/api/learning/skills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Valid skill", agentId: "" }),
    })
    expect(invalidAgentId.status).toBe(400)
    expect(await invalidAgentId.json()).toMatchObject({
      code: "invalid_learning_payload",
    })

    const invalidJson = await app.request("/api/learning/skills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{",
    })
    expect(invalidJson.status).toBe(400)
    expect(await invalidJson.json()).toMatchObject({
      code: "invalid_learning_payload",
    })
  })

  it("lists, accepts, and dismisses learning suggestions", async () => {
    ctx = createTestContext()
    const app = createApp(ctx.repos, ctx.config)
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
      confidence: 0.82,
      sourceThreadId: thread.id,
      sourceThreadTitle: thread.title,
      agentId: agent.id,
    })

    const listResponse = await app.request("/api/learning/suggestions")
    expect(listResponse.status).toBe(200)
    const listBody = (await listResponse.json()) as {
      totalCount: number
      suggestions: Array<{ id: string; status: string }>
    }
    expect(listBody.totalCount).toBe(1)
    expect(listBody.suggestions[0]).toMatchObject({
      id: suggestion.id,
      status: "pending",
    })

    const summaryBeforeAccept = await app.request("/api/learning/summary")
    expect(await summaryBeforeAccept.json()).toMatchObject({
      pendingSuggestionsCount: 1,
    })

    const acceptResponse = await app.request(
      `/api/learning/suggestions/${suggestion.id}/accept`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinnedToContext: true }),
      }
    )
    expect(acceptResponse.status).toBe(200)
    const acceptBody = (await acceptResponse.json()) as {
      suggestion: { status: string }
      savedMemoryId?: string
    }
    expect(acceptBody.suggestion.status).toBe("accepted")
    expect(acceptBody.savedMemoryId).toBeTruthy()

    const memory = ctx.repos.savedMemories.getById(acceptBody.savedMemoryId!)
    expect(memory).toMatchObject({
      content: "Prefer concise summaries.",
      pinnedToContext: true,
      source: "thread-derived",
      sourceThreadId: thread.id,
    })

    const dismissSuggestion = ctx.repos.learningSuggestions.create({
      suggestionType: "memory",
      title: "Dismiss me",
      content: "Temporary note.",
      sourceThreadId: thread.id,
      sourceThreadTitle: thread.title,
      agentId: agent.id,
    })
    const dismissResponse = await app.request(
      `/api/learning/suggestions/${dismissSuggestion.id}/dismiss`,
      { method: "POST" }
    )
    expect(dismissResponse.status).toBe(200)
    expect(await dismissResponse.json()).toMatchObject({ status: "dismissed" })

    const summaryAfter = await app.request("/api/learning/summary")
    expect(await summaryAfter.json()).toMatchObject({
      pendingSuggestionsCount: 0,
      memoriesCount: SEEDED_MEMORY_COUNT + 1,
    })
  })

  it("creates, reads, updates, and deletes rubrics with weighted criteria", async () => {
    ctx = createTestContext()
    const app = createApp(ctx.repos, ctx.config)
    const agent = ctx.repos.agents.createWithGrants(
      {
        name: "Rubric Agent",
        systemPrompt: "Score runs",
        model: "openai/gpt-5.4-mini",
      },
      []
    )

    const createResponse = await app.request("/api/learning/rubrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Support quality",
        description: "  ",
        agentId: agent.id,
        criteria: [
          { name: "Resolution", weight: 2 },
          { name: "Tone", weight: 1 },
        ],
      }),
    })
    expect(createResponse.status).toBe(201)
    const created = (await createResponse.json()) as {
      id: string
      name: string
      description: string | null
      criteria: Array<{ id: string; name: string; weight: number }>
    }
    expect(created.name).toBe("Support quality")
    expect(created.description).toBeNull()
    expect(created.criteria).toHaveLength(2)
    expect(created.criteria[0]?.weight).toBe(2)

    const getResponse = await app.request(`/api/learning/rubrics/${created.id}`)
    expect(getResponse.status).toBe(200)
    expect(await getResponse.json()).toMatchObject({ id: created.id })

    const patchResponse = await app.request(`/api/learning/rubrics/${created.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        criteria: [{ name: "Resolution", weight: 1 }],
      }),
    })
    expect(patchResponse.status).toBe(200)
    const patched = (await patchResponse.json()) as {
      criteria: Array<{ name: string }>
    }
    expect(patched.criteria).toHaveLength(1)
    expect(patched.criteria[0]?.name).toBe("Resolution")

    const summaryResponse = await app.request("/api/learning/summary")
    expect(await summaryResponse.json()).toMatchObject({ rubricsCount: 1 })

    const deleteResponse = await app.request(`/api/learning/rubrics/${created.id}`, {
      method: "DELETE",
    })
    expect(deleteResponse.status).toBe(204)
    expect((await app.request(`/api/learning/rubrics/${created.id}`)).status).toBe(
      404
    )
  })

  it("includes saved memories in learning summary and paginated list", async () => {
    ctx = createTestContext()
    const app = createApp(ctx.repos, ctx.config)

    const createMemory = await app.request("/api/memories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "Prefer concise summaries.",
        category: "memory_category_preference",
        usageGuidance: "Use when summarizing work.",
        tags: [],
        importance: "medium",
        scope: "global",
        pinnedToContext: false,
      }),
    })
    expect(createMemory.status).toBe(201)

    const summaryResponse = await app.request("/api/learning/summary")
    expect(await summaryResponse.json()).toMatchObject({
      skillsCount: 0,
      pinnedSkillsCount: 0,
      memoriesCount: SEEDED_MEMORY_COUNT + 1,
      rubricsCount: 0,
      pendingSuggestionsCount: 0,
    })

    const memoriesResponse = await app.request("/api/learning/memories?page=1&pageSize=20")
    const memoriesBody = (await memoriesResponse.json()) as {
      totalCount: number
      memories: Array<{ content: string }>
    }
    expect(memoriesBody.totalCount).toBe(SEEDED_MEMORY_COUNT + 1)
    expect(memoriesBody.memories.some((memory) => memory.content === "Prefer concise summaries.")).toBe(
      true
    )
  })
})
