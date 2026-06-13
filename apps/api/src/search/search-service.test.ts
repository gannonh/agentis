import { describe, expect, it, vi } from "vitest"
import type { Repositories } from "../repositories/index.js"
import { SearchService } from "./search-service.js"

function createRepos({
  threads = [],
  artifacts = [],
  agents = [],
  projects = [],
}: {
  threads?: unknown[]
  artifacts?: unknown[]
  agents?: unknown[]
  projects?: unknown[]
}) {
  return {
    threads: { search: vi.fn(() => threads) },
    artifacts: { search: vi.fn(() => artifacts) },
    agents: { search: vi.fn(() => agents) },
    projects: { search: vi.fn(() => projects) },
  } as unknown as Repositories
}

describe("SearchService", () => {
  it("falls back from empty presentation subtitles to useful labels", () => {
    const service = new SearchService(
      createRepos({
        threads: [
          {
            id: "thread_1",
            title: "Follow-up",
            agentNameSnapshot: "",
            status: "completed",
          },
        ],
        projects: [
          {
            id: "project_1",
            name: "Prospects",
            description: "",
            goals: "Track prospect outreach",
          },
        ],
      })
    )

    const result = service.search("prospect")

    expect(result.threads[0]?.subtitle).toBe("completed")
    expect(result.projects[0]?.subtitle).toBe("Track prospect outreach")
  })

  it("fails loudly when callers pass an unnormalized query", () => {
    const service = new SearchService(createRepos({}))

    expect(() => service.search("  prospect  ")).toThrow(
      "SearchService.search requires a normalized search query."
    )
  })
})
