import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router"
import type { ArtifactPublic as Artifact } from "@workspace/shared"
import { Button } from "@workspace/ui/components/button"
import { formatRelativeTime } from "@/fixtures"
import {
  artifactWorkspacePath,
  documentWorkspacePath,
  listArtifacts,
} from "@/lib/api/projects-client"

type ThreadDurableArtifactsProps = {
  threadId: string
  refreshKey?: string
}

function artifactPath(artifact: Artifact) {
  if (artifact.type === "document") return documentWorkspacePath(artifact.id)
  if (artifact.type === "webpage" || artifact.type === "slides") {
    return artifactWorkspacePath(artifact.id)
  }
  return null
}

function artifactActionLabel(artifact: Artifact) {
  if (artifact.type === "document") return "Open document"
  if (artifact.type === "webpage" || artifact.type === "slides") {
    return "Open artifact"
  }
  return null
}

function artifactMetadata(artifact: Artifact) {
  return [
    artifact.type,
    artifact.contentFormat,
    artifact.currentVersion ? `v${artifact.currentVersion}` : null,
  ]
    .filter(Boolean)
    .join(" · ")
}

export function ThreadDurableArtifacts({
  threadId,
  refreshKey,
}: ThreadDurableArtifactsProps) {
  const [artifacts, setArtifacts] = useState<Artifact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void listArtifacts({ threadId })
      .then((items) => {
        if (!cancelled) {
          setArtifacts(items)
          setError(null)
        }
      })
      .catch((failure) => {
        if (!cancelled) {
          setArtifacts([])
          setError(
            failure instanceof Error
              ? failure.message
              : "Could not load durable artifacts."
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [threadId, refreshKey])

  const sortedArtifacts = useMemo(
    () =>
      [...artifacts].sort(
        (left, right) =>
          new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
      ),
    [artifacts]
  )

  return (
    <section className="flex w-72 shrink-0 flex-col gap-3 bg-card/40 p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium">Durable artifacts</h2>
        {sortedArtifacts.length ? (
          <span className="rounded-full border border-border bg-input/20 px-2 py-0.5 text-[0.625rem] font-medium text-muted-foreground">
            {sortedArtifacts.length}
          </span>
        ) : null}
      </div>
      {loading ? (
        <p className="text-xs text-muted-foreground">Loading artifacts...</p>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {!loading && !error && sortedArtifacts.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No durable artifacts yet.
        </p>
      ) : null}
      {sortedArtifacts.length ? (
        <ul className="flex flex-col gap-2">
          {sortedArtifacts.map((artifact) => (
            <li
              key={artifact.id}
              className="rounded-lg border border-border px-3 py-2 text-xs"
            >
              <p className="font-medium leading-snug">{artifact.title}</p>
              <p className="mt-1 text-muted-foreground">
                {artifactMetadata(artifact)}
              </p>
              <p className="mt-1 text-muted-foreground">
                Updated {formatRelativeTime(artifact.updatedAt)}
              </p>
              {artifactPath(artifact) && artifactActionLabel(artifact) ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  nativeButton={false}
                  render={<Link to={artifactPath(artifact)!} />}
                >
                  {artifactActionLabel(artifact)}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
