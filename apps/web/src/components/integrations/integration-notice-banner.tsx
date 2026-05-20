import { HugeiconsIcon } from "@hugeicons/react"
import { Tick01Icon } from "@hugeicons/core-free-icons"

type IntegrationNoticeBannerProps = {
  message: string
}

export function IntegrationNoticeBanner({ message }: IntegrationNoticeBannerProps) {
  return (
    <div
      role="status"
      className="flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-4 py-2.5"
    >
      <HugeiconsIcon
        icon={Tick01Icon}
        className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400"
        strokeWidth={2}
        aria-hidden
      />
      <p className="text-sm font-medium text-emerald-950 dark:text-emerald-100">{message}</p>
    </div>
  )
}
