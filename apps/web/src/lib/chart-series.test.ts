import { describe, expect, it } from "vitest"
import { buildDailyCostSeries, buildDailyScoreSeries } from "./chart-series"

describe("chart series helpers", () => {
  it("maps server-ordered daily cost values without regenerating dates", () => {
    expect(
      buildDailyCostSeries([
        { date: "2026-06-10", costUsd: 1.25 },
        { date: "2026-06-11", costUsd: 0 },
        { date: "2026-06-12", costUsd: 2.5 },
      ])
    ).toEqual([1.25, 0, 2.5])
  })

  it("maps server-ordered daily score values without regenerating dates", () => {
    expect(
      buildDailyScoreSeries([
        { date: "2026-06-10", avgScore: 80 },
        { date: "2026-06-11", avgScore: null },
        { date: "2026-06-12", avgScore: 92 },
      ])
    ).toEqual([80, null, 92])
  })
})
