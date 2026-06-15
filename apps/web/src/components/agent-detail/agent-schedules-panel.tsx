import { useMemo, useState, type FormEvent } from "react"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import type {
  AgentSchedule,
  AgentScheduleCadence,
  AgentScheduleCadenceConfig,
  CreateAgentScheduleRequest,
  UpdateAgentScheduleRequest,
} from "@workspace/shared"
import { useAgentSchedules } from "@/hooks/use-agent-schedules"
import { useProjects } from "@/hooks/use-projects"

const WEEKDAY_OPTIONS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
] as const

const DEFAULT_TIMEZONE = "UTC"

function buildCadenceConfig(
  form: ScheduleFormState
): AgentScheduleCadenceConfig {
  switch (form.cadence) {
    case "hourly":
      return { cadence: "hourly", minute: Number(form.minute) }
    case "daily":
      return { cadence: "daily", time: form.time }
    case "weekly":
      return {
        cadence: "weekly",
        weekday: Number(form.weekday),
        time: form.time,
      }
    case "custom":
      return { cadence: "custom" }
  }
}

function buildUpdateSchedulePayload(
  form: ScheduleFormState
): UpdateAgentScheduleRequest {
  const {
    name,
    cadence,
    timezone,
    promptTemplate,
    projectId,
    cadenceConfig,
    cronExpression,
  } = buildSchedulePayload(form)
  return {
    name,
    cadence,
    timezone,
    promptTemplate,
    projectId,
    cadenceConfig,
    cronExpression: cadence === "custom" ? (cronExpression ?? null) : null,
  }
}

function cadenceLabel(schedule: AgentSchedule): string {
  switch (schedule.cadence) {
    case "hourly":
      return schedule.cadenceConfig.cadence === "hourly"
        ? `Hourly at :${String(schedule.cadenceConfig.minute).padStart(2, "0")}`
        : "Hourly"
    case "daily":
      return schedule.cadenceConfig.cadence === "daily"
        ? `Daily at ${schedule.cadenceConfig.time}`
        : "Daily"
    case "weekly": {
      const config = schedule.cadenceConfig
      return config.cadence === "weekly"
        ? `Weekly on ${WEEKDAY_OPTIONS.find((day) => day.value === config.weekday)?.label ?? "day"} at ${config.time}`
        : "Weekly"
    }
    case "custom":
      return schedule.cronExpression
        ? `Custom: ${schedule.cronExpression}`
        : "Custom cron"
    default:
      return schedule.cadence
  }
}

function formatTimestamp(value?: string | null) {
  if (!value) return "—"
  return new Date(value).toLocaleString()
}

type ScheduleFormState = {
  name: string
  cadence: AgentScheduleCadence
  timezone: string
  promptTemplate: string
  projectId: string
  minute: string
  time: string
  weekday: string
  cronExpression: string
}

function emptyFormState(): ScheduleFormState {
  return {
    name: "",
    cadence: "hourly",
    timezone: DEFAULT_TIMEZONE,
    promptTemplate: "",
    projectId: "",
    minute: "0",
    time: "09:00",
    weekday: "1",
    cronExpression: "0 9 * * *",
  }
}

function formStateFromSchedule(schedule: AgentSchedule): ScheduleFormState {
  const base = emptyFormState()
  return {
    name: schedule.name,
    cadence: schedule.cadence,
    timezone: schedule.timezone,
    promptTemplate: schedule.promptTemplate,
    projectId: schedule.projectId ?? "",
    minute:
      schedule.cadenceConfig.cadence === "hourly"
        ? String(schedule.cadenceConfig.minute)
        : base.minute,
    time:
      schedule.cadenceConfig.cadence === "daily" ||
      schedule.cadenceConfig.cadence === "weekly"
        ? schedule.cadenceConfig.time
        : base.time,
    weekday:
      schedule.cadenceConfig.cadence === "weekly"
        ? String(schedule.cadenceConfig.weekday)
        : base.weekday,
    cronExpression: schedule.cronExpression ?? base.cronExpression,
  }
}

function buildSchedulePayload(
  form: ScheduleFormState,
  status?: AgentSchedule["status"]
): CreateAgentScheduleRequest {
  const cadenceConfig = buildCadenceConfig(form)

  return {
    name: form.name.trim(),
    status,
    cadence: form.cadence,
    timezone: form.timezone.trim(),
    promptTemplate: form.promptTemplate.trim(),
    projectId: form.projectId.trim() ? form.projectId.trim() : null,
    cronExpression:
      form.cadence === "custom" ? form.cronExpression.trim() : undefined,
    cadenceConfig,
  }
}

export function AgentSchedulesPanel({ agentId }: { agentId: string }) {
  const {
    schedules,
    loading,
    error,
    createSchedule,
    saveSchedule,
    removeSchedule,
  } = useAgentSchedules(agentId)
  const { projects } = useProjects()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<AgentSchedule | null>(
    null
  )
  const [form, setForm] = useState<ScheduleFormState>(emptyFormState)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const sortedSchedules = useMemo(
    () =>
      [...schedules].sort((left, right) =>
        right.updatedAt.localeCompare(left.updatedAt)
      ),
    [schedules]
  )

  function openCreateDialog() {
    setEditingSchedule(null)
    setForm(emptyFormState())
    setFormError(null)
    setDialogOpen(true)
  }

  function openEditDialog(schedule: AgentSchedule) {
    setEditingSchedule(schedule)
    setForm(formStateFromSchedule(schedule))
    setFormError(null)
    setDialogOpen(true)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setFormError(null)
    try {
      if (editingSchedule) {
        await saveSchedule(
          editingSchedule.id,
          buildUpdateSchedulePayload(form)
        )
      } else {
        await createSchedule(buildSchedulePayload(form, "enabled"))
      }
      setDialogOpen(false)
    } catch (submitError) {
      setFormError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to save schedule"
      )
    } finally {
      setSaving(false)
    }
  }

  async function toggleSchedule(schedule: AgentSchedule) {
    await saveSchedule(schedule.id, {
      status: schedule.status === "enabled" ? "disabled" : "enabled",
    })
  }

  return (
    <section className="flex flex-col gap-3" data-testid="agent-schedules-panel">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium">Schedules</h2>
          <p className="text-sm text-muted-foreground">
            Run this agent on Hourly, Daily, Weekly, or Custom cron cadences.
          </p>
        </div>
        <Button type="button" size="sm" onClick={openCreateDialog}>
          Create schedule
        </Button>
      </div>

      {loading ? (
        <p className="rounded-xl border border-border bg-card/70 px-4 py-5 text-sm text-muted-foreground">
          Loading schedules…
        </p>
      ) : error ? (
        <p className="rounded-xl border border-border bg-card/70 px-4 py-5 text-sm text-destructive">
          {error}
        </p>
      ) : sortedSchedules.length === 0 ? (
        <p className="rounded-xl border border-border bg-card/70 px-4 py-5 text-sm text-muted-foreground">
          No schedules yet. Create one to run this agent in the background.
        </p>
      ) : (
        sortedSchedules.map((schedule) => (
          <article
            key={schedule.id}
            className="rounded-xl border border-border bg-card/70 p-4"
            data-testid={`agent-schedule-${schedule.id}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-medium">{schedule.name}</h3>
                  <Badge variant="secondary">
                    {schedule.status === "enabled" ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {cadenceLabel(schedule)} · {schedule.timezone}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Next run: {formatTimestamp(schedule.nextRunAt)}
                </p>
                {schedule.lastRunAt ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Last run: {formatTimestamp(schedule.lastRunAt)}
                    {schedule.lastRunStatus
                      ? ` (${schedule.lastRunStatus})`
                      : ""}
                  </p>
                ) : null}
                {schedule.lastFailureReason ? (
                  <p className="mt-1 text-sm text-destructive">
                    {schedule.lastFailureReason}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => openEditDialog(schedule)}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void toggleSchedule(schedule)}
                >
                  {schedule.status === "enabled" ? "Disable" : "Enable"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void removeSchedule(schedule.id)}
                >
                  Delete
                </Button>
              </div>
            </div>
          </article>
        ))
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <form onSubmit={(event) => void handleSubmit(event)}>
            <DialogHeader>
              <DialogTitle>
                {editingSchedule ? "Edit schedule" : "Create schedule"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-4">
              <label className="grid gap-1 text-sm">
                <span>Name</span>
                <Input
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  required
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span>Cadence</span>
                <select
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={form.cadence}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      cadence: event.target.value as AgentScheduleCadence,
                    }))
                  }
                >
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="custom">Custom cron</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                <span>Timezone</span>
                <Input
                  value={form.timezone}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      timezone: event.target.value,
                    }))
                  }
                  required
                />
              </label>
              {form.cadence === "hourly" ? (
                <label className="grid gap-1 text-sm">
                  <span>Minute of hour</span>
                  <Input
                    type="number"
                    min={0}
                    max={59}
                    value={form.minute}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        minute: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
              ) : null}
              {form.cadence === "daily" || form.cadence === "weekly" ? (
                <label className="grid gap-1 text-sm">
                  <span>Local time</span>
                  <Input
                    value={form.time}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        time: event.target.value,
                      }))
                    }
                    placeholder="09:00"
                    required
                  />
                </label>
              ) : null}
              {form.cadence === "weekly" ? (
                <label className="grid gap-1 text-sm">
                  <span>Weekday</span>
                  <select
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                    value={form.weekday}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        weekday: event.target.value,
                      }))
                    }
                  >
                    {WEEKDAY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              {form.cadence === "custom" ? (
                <label className="grid gap-1 text-sm">
                  <span>Cron expression</span>
                  <Input
                    value={form.cronExpression}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        cronExpression: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
              ) : null}
              <label className="grid gap-1 text-sm">
                <span>Prompt template</span>
                <Textarea
                  value={form.promptTemplate}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      promptTemplate: event.target.value,
                    }))
                  }
                  rows={4}
                  required
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span>Project context (optional)</span>
                <select
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={form.projectId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      projectId: event.target.value,
                    }))
                  }
                >
                  <option value="">No project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </label>
              {formError ? (
                <p className="text-sm text-destructive">{formError}</p>
              ) : null}
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : editingSchedule ? "Save changes" : "Create schedule"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  )
}
