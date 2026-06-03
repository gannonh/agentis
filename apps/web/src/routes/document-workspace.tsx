import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router"
import type { DocumentVisibilityScope, Project } from "@workspace/shared"
import { ApiError } from "@/lib/api/client"
import {
  downloadDocumentFile,
  getDocumentDetail,
  listProjects,
  updateDocumentContent,
  updateDocumentVisibility,
} from "@/lib/api/projects-client"
import { isMarkdownEditable } from "@/lib/documents/document-metadata"
import { DocumentEditor } from "@/components/documents/document-editor"
import { DocumentSidePanel } from "@/components/documents/document-side-panel"
import { DocumentViewer } from "@/components/documents/document-viewer"
import { DocumentWorkspaceShell } from "@/components/documents/document-workspace-shell"

type CanvasTab = "preview" | "markdown"

export function DocumentWorkspacePage() {
  const { documentId = "" } = useParams()
  const navigate = useNavigate()
  const [detail, setDetail] = useState<Awaited<
    ReturnType<typeof getDocumentDetail>
  > | null>(null)
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null)
  const [canvasTab, setCanvasTab] = useState<CanvasTab>("preview")
  const [editing, setEditing] = useState(false)
  const [draftContent, setDraftContent] = useState("")
  const [loadedContent, setLoadedContent] = useState("")
  const [loadedBaseVersion, setLoadedBaseVersion] = useState<number | null>(
    null
  )
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [scopeSaving, setScopeSaving] = useState(false)
  const [scopeError, setScopeError] = useState<string | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [scopeDraft, setScopeDraft] =
    useState<DocumentVisibilityScope>("thread")
  const [projectIdDraft, setProjectIdDraft] = useState("")
  const hasLoadedRef = useRef(false)

  const loadDetail = useCallback(
    async (version?: number | null) => {
      if (!documentId) return
      const initialLoad = !hasLoadedRef.current
      if (initialLoad) setLoading(true)
      setError(null)
      try {
        const next = await getDocumentDetail(
          documentId,
          version == null ? {} : { version }
        )
        setDetail(next)
        setSelectedVersion(next.selectedVersion ?? next.currentVersion ?? null)
        const content = next.content ?? ""
        setLoadedContent(content)
        setDraftContent(content)
        setLoadedBaseVersion(next.currentVersion ?? null)
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load document"
        )
      } finally {
        if (initialLoad) {
          hasLoadedRef.current = true
          setLoading(false)
        }
      }
    },
    [documentId]
  )

  useEffect(() => {
    hasLoadedRef.current = false
    void loadDetail(null)
  }, [documentId, loadDetail])

  useEffect(() => {
    let cancelled = false
    void listProjects()
      .then((items) => {
        if (!cancelled) setProjects(items)
      })
      .catch(() => {
        if (!cancelled) setProjects([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!detail) return
    setScopeDraft(detail.document.visibilityScope)
    setProjectIdDraft(detail.document.projectId ?? "")
    setScopeError(null)
  }, [detail])

  const viewingHistoricalVersion = useMemo(() => {
    if (!detail?.currentVersion || selectedVersion == null) return false
    return selectedVersion !== detail.currentVersion
  }, [detail?.currentVersion, selectedVersion])

  const readOnly = detail ? !isMarkdownEditable(detail.document) : false
  const truncated = detail?.truncated === true
  const editingDisabled = readOnly || viewingHistoricalVersion || truncated
  const currentVersion =
    detail?.currentVersion ?? detail?.document.currentVersion ?? null

  const handleClose = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate("/library")
  }

  const handleSelectVersion = (version: number | null) => {
    setEditing(false)
    setSaveError(null)
    if (version == null || version === detail?.currentVersion) {
      void loadDetail(null)
      return
    }
    void loadDetail(version)
  }

  const handleStartEdit = () => {
    if (editingDisabled) return
    setSaveError(null)
    setDraftContent(loadedContent)
    setEditing(true)
  }

  const handleSave = async () => {
    if (!detail || loadedBaseVersion == null) return
    if (!draftContent.trim() || draftContent === loadedContent) {
      setSaveError("Change the markdown content before saving.")
      return
    }

    setSaving(true)
    setSaveError(null)
    try {
      await updateDocumentContent(documentId, {
        content: draftContent,
        baseVersion: loadedBaseVersion,
        changeSummary: "Updated in document workspace",
      })
      setEditing(false)
      await loadDetail(null)
    } catch (saveFailure) {
      if (saveFailure instanceof ApiError && saveFailure.status === 409) {
        setSaveError(
          "This document changed elsewhere. Reload the current version before saving."
        )
        return
      }
      setSaveError(
        saveFailure instanceof Error ? saveFailure.message : "Save failed"
      )
    } finally {
      setSaving(false)
    }
  }

  const applyVisibilityScope = async (
    visibilityScope: DocumentVisibilityScope,
    projectId?: string
  ) => {
    if (!detail) return

    setScopeSaving(true)
    setScopeError(null)
    try {
      await updateDocumentVisibility(documentId, {
        visibilityScope,
        ...(visibilityScope === "project" && projectId ? { projectId } : {}),
      })
      await loadDetail(selectedVersion)
    } catch (scopeFailure) {
      setScopeError(
        scopeFailure instanceof Error
          ? scopeFailure.message
          : "Failed to update document scope"
      )
    } finally {
      setScopeSaving(false)
    }
  }

  const handleVisibilityScopeChange = async (
    visibilityScope: DocumentVisibilityScope
  ) => {
    if (!detail) return

    setScopeDraft(visibilityScope)
    setScopeError(null)

    if (visibilityScope === "project") {
      const resolvedProjectId =
        detail.document.projectId ?? projectIdDraft.trim()
      if (!resolvedProjectId) {
        return
      }
      if (
        detail.document.visibilityScope === "project" &&
        detail.document.projectId === resolvedProjectId
      ) {
        return
      }
      await applyVisibilityScope("project", resolvedProjectId)
      return
    }

    if (visibilityScope === detail.document.visibilityScope) return
    await applyVisibilityScope(visibilityScope)
  }

  const handleProjectChange = async (projectId: string) => {
    if (!projectId) return
    setProjectIdDraft(projectId)
    setScopeDraft("project")
    await applyVisibilityScope("project", projectId)
  }

  const handleDownload = async () => {
    if (!detail) return
    setDownloadError(null)
    try {
      await downloadDocumentFile(detail.document)
    } catch (downloadFailure) {
      setDownloadError(
        downloadFailure instanceof Error
          ? downloadFailure.message
          : "Download failed"
      )
    }
  }

  if (loading && !detail) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading document…</p>
      </div>
    )
  }

  if (error || !detail) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm text-destructive">
          {error ?? "Document not found"}
        </p>
        <button
          type="button"
          className="text-sm text-primary underline-offset-4 hover:underline"
          onClick={handleClose}
        >
          Go back
        </button>
      </div>
    )
  }

  return (
    <DocumentWorkspaceShell
      document={detail.document}
      currentVersion={currentVersion}
      viewingHistoricalVersion={viewingHistoricalVersion}
      readOnly={readOnly}
      truncated={truncated}
      onClose={handleClose}
      canvasTab={canvasTab}
      onCanvasTabChange={setCanvasTab}
      editing={editing}
      onStartEdit={handleStartEdit}
      previewContent={
        <DocumentViewer mode="preview" content={detail.content ?? ""} />
      }
      markdownContent={
        <DocumentViewer mode="markdown" content={detail.content ?? ""} />
      }
      editorContent={
        <DocumentEditor
          value={draftContent}
          onChange={setDraftContent}
          onSave={() => void handleSave()}
          onCancel={() => {
            setEditing(false)
            setDraftContent(loadedContent)
            setSaveError(null)
          }}
          saving={saving}
          disabled={editingDisabled}
          error={saveError}
        />
      }
      sidePanel={
        <DocumentSidePanel
          document={detail.document}
          detail={detail}
          selectedVersion={selectedVersion}
          viewingHistoricalVersion={viewingHistoricalVersion}
          onSelectVersion={handleSelectVersion}
          onDownload={() => void handleDownload()}
          downloadError={downloadError}
          projects={projects}
          scopeDraft={scopeDraft}
          projectIdDraft={projectIdDraft}
          onVisibilityScopeChange={(scope) =>
            void handleVisibilityScopeChange(scope)
          }
          onProjectChange={(projectId) => void handleProjectChange(projectId)}
          scopeSaving={scopeSaving}
          scopeError={scopeError}
        />
      }
    />
  )
}
