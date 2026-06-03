import { cjk } from "@streamdown/cjk"
import { code } from "@streamdown/code"
import { math } from "@streamdown/math"
import { mermaid } from "@streamdown/mermaid"
import { Streamdown } from "streamdown"
import { cn } from "@workspace/ui/lib/utils"

const streamdownPlugins = { cjk, code, math, mermaid }

type DocumentViewerProps = {
  mode: "preview" | "markdown"
  content: string
  emptyMessage?: string
  className?: string
}

export function DocumentViewer({
  mode,
  content,
  emptyMessage = "This document has no markdown content yet.",
  className,
}: DocumentViewerProps) {
  if (!content.trim()) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed border-border px-4 py-12 text-center text-sm">
        {emptyMessage}
      </p>
    )
  }

  if (mode === "preview") {
    return (
      <div
        className={cn(
          "prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
          className
        )}
      >
        <Streamdown plugins={streamdownPlugins}>{content}</Streamdown>
      </div>
    )
  }

  return (
    <pre
      aria-label="Markdown source"
      className={cn(
        "max-h-[min(70vh,48rem)] overflow-auto rounded-lg border border-border bg-muted/40 p-4 font-mono text-xs whitespace-pre-wrap",
        className
      )}
    >
      {content}
    </pre>
  )
}
