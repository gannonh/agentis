type ScoreTrendChartProps = {
  points: Array<number | null>
  ariaLabel: string
}

export function ScoreTrendChart({ points, ariaLabel }: ScoreTrendChartProps) {
  const plotted = points
    .map((value, index) => (value == null ? null : { index, value }))
    .filter((entry): entry is { index: number; value: number } => entry !== null)

  const width = 600
  const height = 132
  const step = width / Math.max(points.length - 1, 1)
  const path = plotted
    .map((entry, pathIndex) => {
      const x = entry.index * step
      const y = height - (entry.value / 100) * 92 - 20
      return `${pathIndex === 0 ? "M" : "L"}${x},${y}`
    })
    .join(" ")

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-36 w-full overflow-visible"
      role="img"
      aria-label={ariaLabel}
    >
      {[20, 48, 76, 104].map((y) => (
        <line
          key={y}
          x1="0"
          x2={width}
          y1={y}
          y2={y}
          className="stroke-border"
          strokeWidth="1"
        />
      ))}
      {path ? (
        <path
          d={path}
          fill="none"
          className="stroke-agent-blue"
          strokeWidth="2"
        />
      ) : null}
      {plotted.map((entry) => {
        const x = entry.index * step
        const y = height - (entry.value / 100) * 92 - 20
        return (
          <circle
            key={entry.index}
            cx={x}
            cy={y}
            r="2.5"
            className="fill-agent-blue"
          />
        )
      })}
    </svg>
  )
}
