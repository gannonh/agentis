import type {
  ArtifactPublic as Artifact,
  ArtifactVersionSummary,
  ArtifactVisibilityScope,
  Project,
} from "@workspace/shared"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { formatRelativeTime } from "@/fixtures"

type ArtifactSidePanelProps = {
  artifact: Artifact
  versions: ArtifactVersionSummary[]
  currentVersion: number | null
  selectedVersion: number | null
  viewingHistoricalVersion: boolean
  onSelectVersion: (version: number | null) => void
  onDownload: () => void
  downloadUrl: string
  downloadError?: string | null
  versionError?: string | null
  projects?: Project[]
  scopeDraft?: ArtifactVisibilityScope
  projectIdDraft?: string
  scopeControlLabel?: string
  onVisibilityScopeChange?: (scope: ArtifactVisibilityScope) => void
  onProjectChange?: (projectId: string) => void
  scopeSaving?: boolean
  scopeError?: string | null
  workspaceUrl?: string
}

type VersionButtonProps = {
  version: ArtifactVersionSummary
  currentVersion: number | null
  selectedVersion: number | null
  onSelect: (version: number) => void
}

function artifactSourceLabel(artifact: Artifact): string {
  if (artifact.agentId || artifact.agentNameSnapshot) return "Agent generated"
  return "User upload"
}

function artifactScopeLabel(artifact: Artifact): string {
  switch (artifact.visibilityScope) {
    case "global":
      return "Global"
    case "project":
      return "Project"
    case "thread":
      return "Thread"
  }
}

function artifactProvenanceLines(artifact: Artifact): string[] {
  const lines: string[] = [artifactSourceLabel(artifact)]
  if (artifact.agentNameSnapshot) lines.push(artifact.agentNameSnapshot)
  if (artifact.threadTitleSnapshot) lines.push(artifact.threadTitleSnapshot)
  if (artifact.projectNameSnapshot) lines.push(artifact.projectNameSnapshot)
  return lines
}

function VersionButton({
  version,
  currentVersion,
  selectedVersion,
  onSelect,
}: VersionButtonProps) {
  const isCurrent = version.version === currentVersion
  const isSelected = version.version === selectedVersion

  return (
    <button
      type="button"
      aria-label={`Version ${version.version}`}
      onClick={() => onSelect(version.version)}
      className="flex w-full flex-col gap-1 rounded-md border border-transparent px-2 py-2 text-left hover:bg-muted/60 data-[selected=true]:border-primary/40 data-[selected=true]:bg-primary/5"
      data-selected={isSelected}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">v{version.version}</span>
        {isCurrent ? <Badge variant="outline">Current</Badge> : null}
      </div>
      <span className="text-xs text-muted-foreground">
        {formatRelativeTime(version.createdAt)}
        {version.changeSummary ? ` · ${version.changeSummary}` : ""}
      </span>
    </button>
  )
}

export function ArtifactSidePanel({
  artifact,
  versions,
  currentVersion,
  selectedVersion,
  viewingHistoricalVersion,
  onSelectVersion,
  onDownload,
  downloadUrl,
  downloadError,
  versionError,
  projects = [],
  scopeDraft,
  projectIdDraft = "",
  scopeControlLabel = "Artifact scope",
  onVisibilityScopeChange,
  onProjectChange,
  scopeSaving = false,
  scopeError,
  workspaceUrl,
}: ArtifactSidePanelProps) {
  const scopeValue = scopeDraft ?? artifact.visibilityScope
  const showProjectPicker =
    scopeValue === "project" && Boolean(onVisibilityScopeChange)
  const provenanceDetails =
    artifactProvenanceLines(artifact).slice(1).join(" · ") ||
    "No additional provenance"
  const sortedVersions = [...versions].sort(
    (left, right) => right.version - left.version
  )

  return (
    <aside className="flex w-full shrink-0 flex-col gap-6 lg:w-72">
      <section className="space-y-3">
        <h2 className="text-sm font-medium">Source &amp; Scope</h2>
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="text-xs tracking-wide text-muted-foreground uppercase">
              Source
            </dt>
            <dd>{artifactSourceLabel(artifact)}</dd>
          </div>
          <div>
            <dt className="text-xs tracking-wide text-muted-foreground uppercase">
              Provenance
            </dt>
            <dd className="text-muted-foreground">{provenanceDetails}</dd>
          </div>
          <div>
            <dt className="text-xs tracking-wide text-muted-foreground uppercase">
              Scope
            </dt>
            <dd>
              {onVisibilityScopeChange ? (
                <div className="mt-1 flex flex-col gap-2">
                  <select
                    aria-label={scopeControlLabel}
                    className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
                    value={scopeValue}
                    disabled={scopeSaving}
                    onChange={(event) =>
                      onVisibilityScopeChange(
                        event.target.value as ArtifactVisibilityScope
                      )
                    }
                  >
                    <option value="thread">Thread</option>
                    <option value="project">Project</option>
                    <option value="global">Global</option>
                  </select>
                  {showProjectPicker ? (
                    projects.length > 0 ? (
                      <select
                        aria-label="Project"
                        className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
                        value={projectIdDraft}
                        disabled={scopeSaving}
                        onChange={(event) =>
                          onProjectChange?.(event.target.value)
                        }
                      >
                        <option value="">Select a project...</option>
                        {projects.map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        No projects available. Create a project first.
                      </p>
                    )
                  ) : null}
                </div>
              ) : (
                artifactScopeLabel(artifact)
              )}
              {scopeError ? (
                <p className="mt-1 text-xs text-destructive">{scopeError}</p>
              ) : null}
            </dd>
          </div>
        </dl>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Actions</h2>
        <div className="flex flex-col gap-2">
          <Button variant="outline" onClick={onDownload}>
            Download
          </Button>
          {workspaceUrl ? (
            <Button
              variant="outline"
              nativeButton={false}
              render={<a href={workspaceUrl} target="_blank" rel="noreferrer" />}
            >
              Open in new tab
            </Button>
          ) : null}
          <a
            href={downloadUrl}
            className="text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            Direct download link
          </a>
          {downloadError ? (
            <p className="text-xs text-destructive">{downloadError}</p>
          ) : null}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium">Version history</h2>
          {viewingHistoricalVersion ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onSelectVersion(null)}
            >
              Back to current
            </Button>
          ) : null}
        </div>
        {versionError ? (
          <p className="text-xs text-destructive">{versionError}</p>
        ) : null}
        {versions.length ? (
          <div className="flex flex-col gap-1">
            {sortedVersions.map((version) => (
              <VersionButton
                key={version.id}
                version={version}
                currentVersion={currentVersion}
                selectedVersion={selectedVersion}
                onSelect={onSelectVersion}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No versions recorded.</p>
        )}
      </section>
    </aside>
  )
}
