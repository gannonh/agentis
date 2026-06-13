type ThreadSummaryLinesProps = {
  title: string
  summary?: string | null
  summaryFallback: string
}

export function ThreadSummaryLines({
  title,
  summary,
  summaryFallback,
}: ThreadSummaryLinesProps) {
  return (
    <div className="flex flex-col gap-1.5 text-left">
      <h3 className="text-sm font-medium leading-snug">{title}</h3>
      <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed">
        {summary ?? summaryFallback}
      </p>
    </div>
  )
}
