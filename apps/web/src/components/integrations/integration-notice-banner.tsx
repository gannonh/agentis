import { HugeiconsIcon } from "@hugeicons/react"
import { Tick01Icon } from "@hugeicons/core-free-icons"

type IntegrationNoticeBannerProps = {
  message: string
}

export function IntegrationNoticeBanner({ message }: IntegrationNoticeBannerProps) {
  return (
    <div
      role="status"
      className="border-status-success-border bg-status-success-muted flex items-center gap-2 rounded-lg border px-4 py-2.5"
    >
      <HugeiconsIcon
        icon={Tick01Icon}
        className="text-status-success-foreground size-4 shrink-0"
        strokeWidth={2}
        aria-hidden
      />
      <p className="text-status-success-foreground text-sm font-medium">{message}</p>
    </div>
  )
}
