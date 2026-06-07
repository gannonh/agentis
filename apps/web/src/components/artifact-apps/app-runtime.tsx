import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { ArtifactDetailResponse } from "@workspace/shared"
import { appMetadataSchema } from "@workspace/shared"
import { getAppState, updateAppState } from "@/lib/api/projects-client"
import { assembleAppSrcDoc, parseBundle } from "./app-srcdoc"

type BridgeMessage = {
  channel: "agentis-app-bridge"
  requestId: string
  method: "state.get" | "state.set" | "runtime.info"
  payload?: { value?: Record<string, unknown> }
}

function PreviewIssue({ code, message }: { code: string; message: string }) {
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
      <p className="font-medium text-amber-700 dark:text-amber-400">{code}</p>
      <p className="mt-1 text-muted-foreground">{message}</p>
    </div>
  )
}

export function AppRuntimePreview({
  detail,
  disabled = false,
}: {
  detail: ArtifactDetailResponse
  disabled?: boolean
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [runtimeError, setRuntimeError] = useState<string | null>(null)
  const metadata = appMetadataSchema.safeParse(detail.artifact.metadata)
  const bundle = useMemo(
    () => parseBundle(detail.content),
    [detail.content]
  )
  const version = detail.currentVersion ?? detail.artifact.currentVersion ?? 1
  const srcDoc = useMemo(() => {
    if (!bundle) return null
    return assembleAppSrcDoc({
      bundle,
      artifactId: detail.artifact.id,
      version,
    })
  }, [bundle, detail.artifact.id, version])

  const handleBridgeMessage = useCallback(
    async (event: MessageEvent) => {
      const iframeWindow = iframeRef.current?.contentWindow
      if (!iframeWindow || event.source !== iframeWindow) return
      const data = event.data as BridgeMessage
      if (!data || data.channel !== "agentis-app-bridge") return

      const respond = (result?: unknown, error?: string) => {
        iframeWindow.postMessage(
          {
            channel: "agentis-app-bridge-response",
            requestId: data.requestId,
            result,
            error,
          },
          "*"
        )
      }

      try {
        if (data.method === "state.get") {
          const state = await getAppState(detail.artifact.id)
          respond(state.state ?? {})
          return
        }
        if (data.method === "state.set") {
          const value = data.payload?.value
          if (!value || typeof value !== "object") {
            respond(undefined, "Invalid App state payload")
            return
          }
          const saved = await updateAppState(detail.artifact.id, value)
          respond(saved.state)
          return
        }
        if (data.method === "runtime.info") {
          respond({
            artifactId: detail.artifact.id,
            version,
            title: detail.artifact.title,
          })
          return
        }
        respond(undefined, "Unsupported bridge method")
      } catch (error) {
        respond(
          undefined,
          error instanceof Error ? error.message : "App bridge request failed"
        )
      }
    },
    [detail.artifact.id, detail.artifact.title, version]
  )

  useEffect(() => {
    window.addEventListener("message", handleBridgeMessage)
    return () => window.removeEventListener("message", handleBridgeMessage)
  }, [handleBridgeMessage])

  if (disabled) {
    return (
      <PreviewIssue
        code="app_runtime_unavailable"
        message="Historical App versions are metadata-only in this release. Select the current version to run the live runtime."
      />
    )
  }

  if (!metadata.success) {
    return (
      <PreviewIssue
        code="app_invalid_bundle"
        message="This artifact does not include valid App metadata."
      />
    )
  }

  if (metadata.data.bundleValidation.status === "failed") {
    return (
      <PreviewIssue
        code="app_invalid_bundle"
        message={
          metadata.data.bundleValidation.errors[0] ??
          "The App bundle failed validation."
        }
      />
    )
  }

  if (!bundle || !srcDoc) {
    return (
      <PreviewIssue
        code="app_runtime_unavailable"
        message={
          runtimeError ??
          "The App bundle could not be loaded for the current version."
        }
      />
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Interactive App runtime with parent-proxied state bridge
      </p>
      <iframe
        ref={iframeRef}
        title={`${detail.artifact.title} App runtime`}
        srcDoc={srcDoc}
        sandbox="allow-scripts"
        className="h-[70vh] w-full rounded-lg border border-border bg-white"
        onError={() => setRuntimeError("App runtime failed to load.")}
      />
    </div>
  )
}
