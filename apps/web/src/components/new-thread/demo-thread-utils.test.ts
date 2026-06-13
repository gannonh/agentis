import { describe, expect, it } from "vitest"
import { HOME_THREAD_SECTION_LIMIT, partitionHomeThreads } from "./demo-thread-utils"

describe("partitionHomeThreads", () => {
  it("splits demo and recent threads in list order up to the limit", () => {
    const threads = [
      { id: "seed_thread_launch_plan", title: "Demo one" },
      { id: "thread_regular", title: "Recent one" },
      { id: "seed_thread_support_triage", title: "Demo two" },
      { id: "thread_other", title: "Recent two" },
      { id: "thread_extra", title: "Recent extra" },
    ]

    const { demoThreads, recentThreads } = partitionHomeThreads(threads, 2)

    expect(demoThreads.map((thread) => thread.id)).toEqual([
      "seed_thread_launch_plan",
      "seed_thread_support_triage",
    ])
    expect(recentThreads.map((thread) => thread.id)).toEqual([
      "thread_regular",
      "thread_other",
    ])
    expect(recentThreads.every((thread) => !thread.id.startsWith("seed_thread_"))).toBe(
      true
    )
  })

  it("uses the default home section limit", () => {
    const threads = Array.from({ length: 5 }, (_, index) => ({
      id: `thread_${index}`,
      title: `Thread ${index}`,
    }))

    const { recentThreads } = partitionHomeThreads(threads)

    expect(recentThreads).toHaveLength(HOME_THREAD_SECTION_LIMIT)
  })
})
