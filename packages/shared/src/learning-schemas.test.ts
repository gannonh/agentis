import { describe, expect, it } from "vitest"
import {
  createLearningSkillRequestSchema,
  learningMemoriesListResponseSchema,
  learningSkillsListResponseSchema,
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

  it("validates create skill requests", () => {
    expect(
      createLearningSkillRequestSchema.parse({
        name: "video-prompting",
        pinned: false,
      }).name
    ).toBe("video-prompting")
  })
})
