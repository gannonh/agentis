import type { ReactNode } from "react"
import type { DocumentPublic as Document } from "@workspace/shared"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { formatRelativeTime } from "@/fixtures"

type DocumentWorkspaceShellProps = {
  document: Document
  currentVersion: number | null
  viewingHistoricalVersion: boolean
  readOnly: boolean
  truncated: boolean
  onClose: () => void
  canvasTab: "preview" | "markdown"
  onCanvasTabChange: (tab: "preview" | "markdown") => void
  editing: boolean
  onStartEdit: () => void
  previewContent: ReactNode
  markdownContent: ReactNode
  editorContent: ReactNode
  sidePanel: ReactNode
}

export function DocumentWorkspaceShell({
  document,
  currentVersion,
  viewingHistoricalVersion,
  readOnly,
  truncated,
  onClose,
  canvasTab,
  onCanvasTabChange,
  editing,
  onStartEdit,
  previewContent,
  markdownContent,
  editorContent,
  sidePanel,
}: DocumentWorkspaceShellProps) {
  return (
    <div className="bg-background/95 fixed inset-0 z-40 flex flex-col overflow-hidden">
      <header className="border-border flex flex-wrap items-start justify-between gap-4 border-b px-4 py-4 sm:px-6">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-lg font-medium">{document.title}</h1>
            <Badge variant="outline" className="capitalize">
              {document.type}
            </Badge>
            {currentVersion ? (
              <Badge variant="outline">v{currentVersion}</Badge>
            ) : null}
            {viewingHistoricalVersion ? (
              <Badge variant="secondary">Historical view</Badge>
            ) : null}
            {readOnly && !viewingHistoricalVersion ? (
              <Badge variant="secondary">Read only</Badge>
            ) : null}
          </div>
          <p className="text-muted-foreground text-sm">
            Updated {formatRelativeTime(document.updatedAt)}
            {truncated ? " · Content truncated for safe loading" : ""}
          </p>
          {viewingHistoricalVersion ? (
            <p className="text-amber-700 text-sm dark:text-amber-400">
              You are viewing an older version. Editing is disabled until you
              return to the current version.
            </p>
          ) : null}
          {readOnly && !viewingHistoricalVersion ? (
            <p className="text-muted-foreground text-sm">
              This document type is read-only in the workspace. Download the
              file to work with it locally.
            </p>
          ) : null}
        </div>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto px-4 py-4 sm:px-6 lg:flex-row">
        <div className="min-w-0 flex-1 space-y-4">
          {editing ? (
            editorContent
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div
                  className="inline-flex rounded-lg border border-border p-0.5"
                  role="tablist"
                  aria-label="Document view"
                >
                  <Button
                    type="button"
                    size="sm"
                    variant={canvasTab === "preview" ? "default" : "ghost"}
                    role="tab"
                    aria-selected={canvasTab === "preview"}
                    onClick={() => onCanvasTabChange("preview")}
                  >
                    Preview
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={canvasTab === "markdown" ? "default" : "ghost"}
                    role="tab"
                    aria-selected={canvasTab === "markdown"}
                    onClick={() => onCanvasTabChange("markdown")}
                  >
                    Markdown
                  </Button>
                </div>
                {!readOnly && !viewingHistoricalVersion && !truncated ? (
                  <Button size="sm" onClick={onStartEdit}>
                    Edit
                  </Button>
                ) : null}
              </div>
              {canvasTab === "preview" ? previewContent : markdownContent}
            </>
          )}
        </div>
        {sidePanel}
      </div>
    </div>
  )
}
