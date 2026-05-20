import { cn } from "@workspace/ui/lib/utils"
type MarkStyle = {
  label: string
  className: string
}

const markStyles: Record<string, MarkStyle> = {
  "google-drive": {
    label: "G",
    className: "bg-emerald-600/90 text-white",
  },
  github: {
    label: "GH",
    className: "bg-neutral-800 text-white dark:bg-neutral-700",
  },
  airtable: {
    label: "A",
    className: "bg-amber-500/90 text-neutral-950",
  },
  slack: {
    label: "S",
    className: "bg-violet-600/90 text-white",
  },
  gmail: {
    label: "M",
    className: "bg-red-600/90 text-white",
  },
  "google-calendar": {
    label: "31",
    className: "bg-sky-600/90 text-white text-[0.6rem]",
  },
  databricks: {
    label: "DB",
    className: "bg-red-700/90 text-white text-[0.6rem]",
  },
  snowflake: {
    label: "SF",
    className: "bg-sky-500/90 text-white text-[0.6rem]",
  },
  notion: {
    label: "N",
    className: "bg-neutral-200 text-neutral-900 dark:bg-neutral-100 dark:text-neutral-900",
  },
  dropbox: {
    label: "D",
    className: "bg-blue-600/90 text-white",
  },
  outlook: {
    label: "O",
    className: "bg-blue-700/90 text-white",
  },
  onedrive: {
    label: "1",
    className: "bg-blue-500/90 text-white",
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
