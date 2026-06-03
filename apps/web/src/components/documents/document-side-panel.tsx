import type {
  DocumentDetailResponse,
  DocumentPublic as Document,
  DocumentVersionSummary,
} from "@workspace/shared"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import { formatRelativeTime } from "@/fixtures"
import {
  documentDownloadUrl,
  documentWorkspacePath,
} from "@/lib/api/projects-client"
import {
  documentProvenanceLines,
  documentScopeLabel,
  documentSourceLabel,
} from "@/lib/documents/document-metadata"

type DocumentSidePanelProps = {
  document: Document
  detail: DocumentDetailResponse
  selectedVersion: number | null
  viewingHistoricalVersion: boolean
  onSelectVersion: (version: number | null) => void
  onDownload: () => void
  downloadError?: string | null
}

function VersionButton({
  version,
  currentVersion,
  selectedVersion,
  onSelect,
}: {
  version: DocumentVersionSummary
  currentVersion: number | null
  selectedVersion: number | null
  onSelect: (version: number) => void
}) {
  const isCurrent = version.version === currentVersion
  const isSelected = version.version === selectedVersion

  return (
    <button
      type="button"
      aria-label={`Version ${version.version}`}
      onClick={() => onSelect(version.version)}
      className="hover:bg-muted/60 flex w-full flex-col gap-1 rounded-md border border-transparent px-2 py-2 text-left data-[selected=true]:border-primary/40 data-[selected=true]:bg-primary/5"
      data-selected={isSelected}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">v{version.version}</span>
        {isCurrent ? <Badge variant="outline">Current</Badge> : null}
      </div>
      <span className="text-muted-foreground text-xs">
        {formatRelativeTime(version.createdAt)}
        {version.changeSummary ? ` · ${version.changeSummary}` : ""}
      </span>
    </button>
  )
}

export function DocumentSidePanel({
  document,
  detail,
  selectedVersion,
  viewingHistoricalVersion,
  onSelectVersion,
  onDownload,
  downloadError,
}: DocumentSidePanelProps) {
  const currentVersion = detail.currentVersion ?? document.currentVersion ?? null
  const workspaceUrl = documentWorkspacePath(document.id)

  return (
    <aside className="flex w-full shrink-0 flex-col gap-6 lg:w-72">
      <section className="space-y-3">
        <h2 className="text-sm font-medium">Source &amp; Scope</h2>
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="text-muted-foreground text-xs uppercase tracking-wide">
              Source
            </dt>
            <dd>{documentSourceLabel(document)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs uppercase tracking-wide">
              Provenance
            </dt>
            <dd className="text-muted-foreground">
              {documentProvenanceLines(document).slice(1).join(" · ") ||
                "No additional provenance"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs uppercase tracking-wide">
              Scope
            </dt>
            <dd>{documentScopeLabel(document)}</dd>
          </div>
        </dl>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Actions</h2>
        <div className="flex flex-col gap-2">
          <Button variant="outline" onClick={onDownload}>
            Download
          </Button>
          <Button variant="outline" render={<a href={workspaceUrl} target="_blank" rel="noreferrer" />}>
            Open in new tab
          </Button>
          <a
            href={documentDownloadUrl(document.id)}
            className="text-muted-foreground text-xs underline-offset-4 hover:underline"
          >
            Direct download link
          </a>
          {downloadError ? (
            <p className="text-destructive text-xs">{downloadError}</p>
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
        {detail.versions.length ? (
          <div className="flex flex-col gap-1">
            {[...detail.versions]
              .sort((left, right) => right.version - left.version)
              .map((version) => (
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
          <p className="text-muted-foreground text-sm">No versions recorded.</p>
        )}
      </section>
    </aside>
  )
}
