import { describe, expect, it } from "vitest"
import {
  acceptLearningSuggestionRequestSchema,
  createLearningSkillRequestSchema,
  learningMemoriesListResponseSchema,
  learningSkillsListResponseSchema,
  learningSuggestionsListResponseSchema,
  learningSummarySchema,
} from "./learning-schemas.js"

describe("learning schemas", () => {
  it("parses summary and paginated list responses", () => {
    expect(
      learningSummarySchema.parse({
        skillsCount: 2,
        pinnedSkillsCount: 1,
        memoriesCount: 3,
        rubricsCount: 0,
        pendingSuggestionsCount: 0,
      })
    ).toMatchObject({ skillsCount: 2, pinnedSkillsCount: 1, memoriesCount: 3 })

    expect(
      learningSkillsListResponseSchema.parse({
        skills: [
          {
            id: "skill_1",
            name: "website-to-hyperframes",
            description: null,
            pinned: true,
            agentId: null,
            createdAt: "2026-06-09T00:00:00.000Z",
            updatedAt: "2026-06-09T00:00:00.000Z",
          },
        ],
        page: 1,
        pageSize: 20,
        totalCount: 1,
        totalPages: 1,
      }).skills
    ).toHaveLength(1)

    expect(
      learningMemoriesListResponseSchema.parse({
        categories: [],
        memories: [],
        page: 1,
        pageSize: 20,
        totalCount: 0,
        totalPages: 0,
      }).totalCount
    ).toBe(0)
  })

  it("parses learning suggestion list and accept payloads", () => {
    expect(
      learningSuggestionsListResponseSchema.parse({
        suggestions: [
          {
            id: "learning_suggestion_1",
            status: "pending",
            suggestionType: "memory",
            title: "Capture preference",
            content: "Prefer concise summaries.",
            confidence: 0.82,
            sourceThreadId: "thread_1",
            sourceThreadTitle: "Creating Agent",
            agentId: "agent_1",
            createdAt: "2026-06-09T00:00:00.000Z",
            updatedAt: "2026-06-09T00:00:00.000Z",
          },
        ],
        page: 1,
        pageSize: 20,
        totalCount: 1,
        totalPages: 1,
      }).suggestions
    ).toHaveLength(1)

    expect(
      acceptLearningSuggestionRequestSchema.parse({
        content: "Prefer concise summaries.",
        pinnedToContext: true,
      }).pinnedToContext
    ).toBe(true)
  })

  it("validates create skill requests", () => {
    expect(
      createLearningSkillRequestSchema.parse({
        name: "video-prompting",
        pinned: false,
      }).name
    ).toBe("video-prompting")
    expect(() =>
      createLearningSkillRequestSchema.parse({
        name: "video-prompting",
        agentId: "",
      })
    ).toThrow()
  })
})
