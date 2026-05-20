import type { ComponentProps } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  RadioIcon,
  Wrench01Icon,
} from "@hugeicons/core-free-icons"

type InfoCardProps = {
  icon: ComponentProps<typeof HugeiconsIcon>["icon"]
  iconClassName: string
  title: string
  children: React.ReactNode
}

function InfoCard({ icon, iconClassName, title, children }: InfoCardProps) {
  return (
    <section className="flex flex-col gap-2 rounded-lg border border-border bg-card px-4 py-4">
      <div className="flex items-center gap-2">
        <span
          className={`flex size-8 shrink-0 items-center justify-center rounded-md ${iconClassName}`}
        >
          <HugeiconsIcon icon={icon} className="size-4" strokeWidth={2} aria-hidden />
        </span>
        <h2 className="text-sm font-medium">{title}</h2>
      </div>
      <p className="text-muted-foreground text-sm leading-relaxed">{children}</p>
    </section>
  )
}

export function IntegrationInfoCards() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <InfoCard
        icon={Wrench01Icon}
        iconClassName="bg-sky-500/15 text-sky-600 dark:text-sky-400"
        title="Agent tools"
      >
        Integrations let agents interact with external services. Enable them in the thread
        toolbar or agent configuration.
      </InfoCard>
      <InfoCard
        icon={RadioIcon}
        iconClassName="bg-violet-500/15 text-violet-600 dark:text-violet-400"
        title="Invocations"
      >
        Trigger agents from outside the web UI.{" "}
        <span className="text-foreground font-medium">Slack</span> listens in channels;{" "}
        <span className="text-foreground font-medium">Scheduled</span> runs recurring jobs.
      </InfoCard>
    </div>
  )
}
