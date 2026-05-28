import type { ReactNode } from "react"

type PageHeaderProps = {
  title: string
  description?: string
  actions?: ReactNode
  leading?: ReactNode
  titleClassName?: string
}

export function PageHeader({
  title,
  description,
  actions,
  leading,
  titleClassName,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-1 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        {leading ? <div className="shrink-0 pt-0.5">{leading}</div> : null}
        <div className="flex min-w-0 flex-col gap-1">
          <h1
            className={titleClassName ?? "text-2xl font-medium tracking-tight"}
          >
            {title}
          </h1>
          {description ? (
            <p className="max-w-2xl text-sm text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  )
}
