export function buildUtcDateRange(periodDays: number): string[] {
  const end = new Date()
  end.setUTCHours(0, 0, 0, 0)
  const dates: string[] = []

  for (let offset = periodDays - 1; offset >= 0; offset -= 1) {
    const day = new Date(end)
    day.setUTCDate(day.getUTCDate() - offset)
    dates.push(day.toISOString().slice(0, 10))
  }

  return dates
}

export function buildDailyCostSeries(
  daily: { date: string; costUsd: number }[],
  periodDays: number
): number[] {
  const dailyByDate = new Map(daily.map((entry) => [entry.date, entry.costUsd]))

  return buildUtcDateRange(periodDays).map(
    (dateKey) => dailyByDate.get(dateKey) ?? 0
  )
}

export function buildDailyScoreSeries(
  daily: { date: string; avgScore: number | null }[],
  periodDays: number
): Array<number | null> {
  const dailyByDate = new Map(daily.map((entry) => [entry.date, entry.avgScore]))

  return buildUtcDateRange(periodDays).map(
    (dateKey) => dailyByDate.get(dateKey) ?? null
  )
}
