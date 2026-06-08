import { Link } from "react-router"
import type { Message, MessagePart } from "@workspace/shared"
import { Button } from "@workspace/ui/components/button"
import { MessageResponse } from "@/components/ai-elements/message"
import {
  formatMessageToolResult,
  type NativeToolDisplay,
} from "@/lib/thread/native-tool-display"
import {
  getDisplayTranscriptText,
  messageHasVisibleContent,
} from "@/lib/thread/message-text"

type ThreadMessageContentProps = {
  message: Message
}

function ToolResultCard({
  toolCallId,
  native,
}: {
  toolCallId: string
  native: NativeToolDisplay
}) {
  return (
    <div
      key={toolCallId}
      className="rounded-lg border border-border/70 bg-card/60 p-3 text-xs"
    >
      {native.toolName ? (
        <p className="font-medium text-foreground">{native.toolName}</p>
      ) : null}
      {native.query ? (
        <p className="mt-1 text-muted-foreground">Query: {native.query}</p>
      ) : null}
      {native.path ? (
        <p className="mt-1 text-muted-foreground">Path: {native.path}</p>
      ) : null}
      {native.outputSummary ? (
        <p className="mt-1 text-muted-foreground">{native.outputSummary}</p>
      ) : null}
      {native.document ? (
        <div className="mt-2">
          <p className="font-medium">Document created</p>
          <p className="mt-1 text-muted-foreground">{native.document.title}</p>
          {native.document.version || native.document.visibilityScope ? (
            <p className="mt-1 text-muted-foreground">
              {[
                native.document.version
                  ? `v${native.document.version}`
                  : null,
                native.document.visibilityScope,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          ) : null}
          {native.document.error ? (
            <p className="mt-1 text-destructive">{native.document.error}</p>
          ) : null}
          {native.document.viewPath && !native.document.error ? (
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              nativeButton={false}
              render={<Link to={native.document.viewPath} />}
            >
              Open document
            </Button>
          ) : null}
        </div>
      ) : null}
      {native.staticArtifact ? (
        <div className="mt-2">
          <p className="font-medium">{native.staticArtifact.actionLabel}</p>
          {native.staticArtifact.title ? (
            <p className="mt-1 text-muted-foreground">
              {native.staticArtifact.title}
            </p>
          ) : null}
          {native.staticArtifact.viewPath ? (
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              nativeButton={false}
              render={<Link to={native.staticArtifact.viewPath} />}
            >
              Open artifact
            </Button>
          ) : null}
        </div>
      ) : null}
      {native.app ? (
        <div className="mt-2">
          <p className="font-medium">{native.app.actionLabel}</p>
          {native.app.title ? (
            <p className="mt-1 text-muted-foreground">{native.app.title}</p>
          ) : null}
          {native.app.viewPath ? (
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              nativeButton={false}
              render={<Link to={native.app.viewPath} />}
            >
              Open artifact
            </Button>
          ) : null}
        </div>
      ) : null}
      {native.sources.length ? (
        <ul className="mt-2 space-y-1 text-muted-foreground">
          {native.sources.map((source) => (
            <li key={source.url}>
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="text-foreground underline-offset-4 hover:underline"
              >
                {source.title}
              </a>
              {source.source ? ` · ${source.source}` : ""}
            </li>
          ))}
        </ul>
      ) : null}
      {native.executionSummary ? (
        <p className="mt-1 text-muted-foreground">{native.executionSummary}</p>
      ) : null}
      {native.changedFiles.length ? (
        <ul className="mt-2 space-y-1 text-muted-foreground">
          {native.changedFiles.map((file, index) => (
            <li key={`${file.operation}:${file.path}:${index}`}>
              Changed {file.path} · {file.operation}
            </li>
          ))}
        </ul>
      ) : null}
      {native.error ? (
        <p className="mt-1 text-destructive">{native.error}</p>
      ) : null}
    </div>
  )
}

function renderToolPart(part: MessagePart, message: Message) {
  if (part.type === "tool-call" && message.status === "streaming") {
    return (
      <p
        key={part.toolCallId}
        className="text-muted-foreground text-xs"
      >
        Running {part.toolName}…
      </p>
    )
  }

  const display = formatMessageToolResult(part)
  if (!display) return null

  if (display.kind === "error") {
    return (
      <p key={display.toolCallId} className="text-destructive text-xs">
        {display.toolName}
        {display.code ? ` (${display.code})` : ""}: {display.error}
      </p>
    )
  }

  return (
    <ToolResultCard
      key={display.toolCallId}
      toolCallId={display.toolCallId}
      native={display.native}
    />
  )
}

export function ThreadMessageContent({ message }: ThreadMessageContentProps) {
  if (!messageHasVisibleContent(message)) {
    return null
  }

  const text = getDisplayTranscriptText(message)
  const toolParts = message.parts.filter(
    (part) =>
      part.type === "tool-result" ||
      part.type === "tool-error" ||
      (part.type === "tool-call" && message.status === "streaming")
  )

  return (
    <div className="flex flex-col gap-2">
      {text.trim() ? <MessageResponse>{text}</MessageResponse> : null}
      {toolParts.map((part) => renderToolPart(part, message))}
      {message.status === "aborted" ? (
        <p className="text-muted-foreground text-xs">Aborted</p>
      ) : null}
      {message.status === "failed" ? (
        <p className="text-destructive text-xs">Failed</p>
      ) : null}
      {message.status === "streaming" ? (
        <p className="text-muted-foreground text-xs">Streaming…</p>
      ) : null}
    </div>
  )
}
