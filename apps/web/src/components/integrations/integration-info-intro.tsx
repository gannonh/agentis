export function IntegrationInfoIntro() {
  return (
    <div className="text-muted-foreground max-w-2xl space-y-3 text-sm leading-relaxed">
      <p>
        <span className="text-foreground font-medium">Agent tools</span> let agents interact
        with external services. Enable them in the thread toolbar or agent configuration.
      </p>
      <p>
        <span className="text-foreground font-medium">Invocations</span> trigger agents from
        outside the web UI.{" "}
        <span className="text-foreground font-medium">Slack</span> listens in channels;{" "}
        <span className="text-foreground font-medium">Scheduled</span> runs recurring jobs.
      </p>
    </div>
  )
}
