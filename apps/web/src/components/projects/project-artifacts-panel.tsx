import { useMemo, useState } from "react"
import type { Artifact } from "@workspace/shared"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { HugeiconsIcon } from "@hugeicons/react"
import { Search01Icon } from "@hugeicons/core-free-icons"
import { formatRelativeTime } from "@/fixtures"
import { artifactDownloadUrl } from "@/lib/api/projects-client"
import { ApiError } from "@/lib/api/client"

type ProjectArtifactsPanelProps = {
  artifacts: Artifact[]
  title: string
  emptyMessage: string
}

export function ProjectArtifactsPanel({
  artifacts,
  title,
  emptyMessage,
}: ProjectArtifactsPanelProps) {
  const [query, setQuery] = useState("")
  const [downloadErrors, setDownloadErrors] = useState<Record<string, string>>(
    {}
  )

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return artifacts
    return artifacts.filter(
      (artifact) =>
        artifact.title.toLowerCase().includes(needle) ||
        artifact.description?.toLowerCase().includes(needle) ||
        artifact.type.toLowerCase().includes(needle)
    )
  }, [artifacts, query])

  const handleDownload = async (artifact: Artifact) => {
    try {
      const response = await fetch(artifactDownloadUrl(artifact.id))
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new ApiError(
          typeof data === "object" &&
            data !== null &&
            "error" in data &&
            typeof data.error === "string"
            ? data.error
            : "Download failed",
          response.status
        )
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = artifact.title
      anchor.click()
      URL.revokeObjectURL(url)
      setDownloadErrors((current) => {
        const next = { ...current }
        delete next[artifact.id]
        return next
      })
    } catch (downloadError) {
      const message =
        downloadError instanceof Error
          ? downloadError.message
          : "Download failed"
      setDownloadErrors((current) => ({
        ...current,
        [artifact.id]: message,
      }))
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-medium">
          {title} ({artifacts.length})
        </h2>
        <div className="relative min-w-[12rem] flex-1 sm:max-w-xs sm:flex-none">
          <HugeiconsIcon
            icon={Search01Icon}
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
            strokeWidth={2}
          />
          <Input
            className="h-8 pl-8"
            placeholder="Search…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm">
          {emptyMessage}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((artifact) => (
            <li
              key={artifact.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{artifact.title}</p>
                <p className="text-muted-foreground text-xs capitalize">
                  {artifact.type} · {formatRelativeTime(artifact.createdAt)}
                  {artifact.threadTitleSnapshot
                    ? ` · ${artifact.threadTitleSnapshot}`
                    : ""}
                </p>
                {downloadErrors[artifact.id] ? (
                  <p className="text-destructive text-xs">
                    {downloadErrors[artifact.id]}
                  </p>
                ) : null}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void handleDownload(artifact)}
              >
                Download
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
