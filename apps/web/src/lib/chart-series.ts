export function buildDailyCostSeries(
  daily: { date: string; costUsd: number }[]
): number[] {
  return daily.map((entry) => entry.costUsd ?? 0)
}

export function buildDailyScoreSeries(
  daily: { date: string; avgScore: number | null }[]
): Array<number | null> {
  return daily.map((entry) => entry.avgScore ?? null)
}
