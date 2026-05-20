import { cn } from "@workspace/ui/lib/utils"
type MarkStyle = {
  label: string
  className: string
}

const markStyles: Record<string, MarkStyle> = {
  "google-drive": {
    label: "G",
    className: "bg-status-success text-white",
  },
  github: {
    label: "GH",
    className: "bg-neutral-800 text-white dark:bg-neutral-700",
  },
  airtable: {
    label: "A",
    className: "bg-status-warning text-neutral-950",
  },
  slack: {
    label: "S",
    className: "bg-agent-blue text-white",
  },
  gmail: {
    label: "M",
    className: "bg-destructive text-white",
  },
  "google-calendar": {
    label: "31",
    className: "bg-status-info text-white text-xs",
  },
  databricks: {
    label: "DB",
    className: "bg-destructive text-white text-xs",
  },
  snowflake: {
    label: "SF",
    className: "bg-status-info text-white text-xs",
  },
  notion: {
    label: "N",
    className: "bg-neutral-200 text-neutral-900 dark:bg-neutral-100 dark:text-neutral-900",
  },
  dropbox: {
    label: "D",
    className: "bg-status-info text-white",
  },
  outlook: {
    label: "O",
    className: "bg-status-info text-white",
  },
  onedrive: {
    label: "1",
    className: "bg-status-info text-white",
  },
}

type IntegrationMarkProps = {
  integrationId: string
  className?: string
}

export function IntegrationMark({ integrationId, className }: IntegrationMarkProps) {
  const style = markStyles[integrationId] ?? {
    label: "?",
    className: "bg-muted text-foreground",
  }

  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-md text-xs font-semibold",
        style.className,
        className
      )}
      aria-hidden
    >
      {style.label}
    </span>
  )
}
