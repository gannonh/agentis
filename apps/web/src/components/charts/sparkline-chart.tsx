type SparklineChartProps = {
  points: number[]
  ariaLabel: string
  strokeClassName?: string
  fillClassName?: string
}

export function SparklineChart({
  points,
  ariaLabel,
  strokeClassName = "stroke-status-success",
  fillClassName = "fill-status-success",
}: SparklineChartProps) {
  const max = Math.max(...points, 0)
  const width = 600
  const height = 132
  const step = width / Math.max(points.length - 1, 1)
  const path = points
    .map((value, index) => {
      const x = index * step
      const y = height - (max > 0 ? value / max : 0) * 92 - 20
      return `${index === 0 ? "M" : "L"}${x},${y}`
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
      <path d={path} fill="none" className={strokeClassName} strokeWidth="2" />
      {points.map((value, index) => {
        const x = index * step
        const y = height - (max > 0 ? value / max : 0) * 92 - 20
        return (
          <circle key={index} cx={x} cy={y} r="2.5" className={fillClassName} />
        )
      })}
    </svg>
  )
}
