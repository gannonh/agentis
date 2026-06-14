import { z } from "zod"

const nonEmptyString = z.string().min(1)

export const agentScheduleStatusSchema = z.enum(["enabled", "disabled"])

export const agentScheduleCadenceSchema = z.enum([
  "hourly",
  "daily",
  "weekly",
  "custom",
])

export const agentScheduleLastRunStatusSchema = z.enum([
  "completed",
  "failed",
  "skipped",
])

export const agentInvocationSourceTypeSchema = z.enum(["schedule"])

export const agentInvocationRunStatusSchema = z.enum([
  "claimed",
  "running",
  "completed",
  "failed",
  "skipped",
])

export const hourlyCadenceConfigSchema = z.object({
  cadence: z.literal("hourly"),
  minute: z.number().int().min(0).max(59),
})

export const dailyCadenceConfigSchema = z.object({
  cadence: z.literal("daily"),
  time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Time must use HH:MM format."),
})

export const weeklyCadenceConfigSchema = z.object({
  cadence: z.literal("weekly"),
  weekday: z.number().int().min(0).max(6),
  time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Time must use HH:MM format."),
})

export const customCadenceConfigSchema = z.object({
  cadence: z.literal("custom"),
})

export const agentScheduleCadenceConfigSchema = z.discriminatedUnion(
  "cadence",
  [
    hourlyCadenceConfigSchema,
    dailyCadenceConfigSchema,
    weeklyCadenceConfigSchema,
    customCadenceConfigSchema,
  ]
)

export const agentScheduleSchema = z.object({
  id: z.string(),
  agentId: z.string(),
  name: nonEmptyString,
  status: agentScheduleStatusSchema,
  cadence: agentScheduleCadenceSchema,
  cronExpression: z.string().nullable().optional(),
  timezone: nonEmptyString,
  promptTemplate: nonEmptyString,
  projectId: z.string().nullable().optional(),
  cadenceConfig: agentScheduleCadenceConfigSchema,
  nextRunAt: z.string().nullable().optional(),
  lastRunAt: z.string().nullable().optional(),
  lastRunStatus: agentScheduleLastRunStatusSchema.nullable().optional(),
  lastFailureReason: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const createAgentScheduleRequestSchema = z
  .object({
    name: nonEmptyString,
    status: agentScheduleStatusSchema.optional(),
    cadence: agentScheduleCadenceSchema,
    cronExpression: z.string().optional(),
    timezone: nonEmptyString,
    promptTemplate: nonEmptyString,
    projectId: z.string().nullable().optional(),
    cadenceConfig: agentScheduleCadenceConfigSchema,
  })
  .superRefine((value, ctx) => {
    if (value.cadenceConfig.cadence !== value.cadence) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Cadence config must match the selected cadence.",
        path: ["cadenceConfig"],
      })
    }
    if (value.cadence === "custom") {
      if (!value.cronExpression?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Custom schedules require a cron expression.",
          path: ["cronExpression"],
        })
      }
    } else if (value.cronExpression) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Cron expression is only allowed for custom schedules.",
        path: ["cronExpression"],
      })
    }
  })

export const updateAgentScheduleRequestSchema = z
  .object({
    name: nonEmptyString.optional(),
    status: agentScheduleStatusSchema.optional(),
    cadence: agentScheduleCadenceSchema.optional(),
    cronExpression: z.string().nullable().optional(),
    timezone: nonEmptyString.optional(),
    promptTemplate: nonEmptyString.optional(),
    projectId: z.string().nullable().optional(),
    cadenceConfig: agentScheduleCadenceConfigSchema.optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one schedule field is required.",
  })

export const agentInvocationRunSchema = z.object({
  id: z.string(),
  sourceType: agentInvocationSourceTypeSchema,
  sourceId: z.string(),
  dueAt: z.string(),
  status: agentInvocationRunStatusSchema,
  threadId: z.string().nullable().optional(),
  runId: z.string().nullable().optional(),
  failureReason: z.string().nullable().optional(),
  claimedAt: z.string().nullable().optional(),
  startedAt: z.string().nullable().optional(),
  finishedAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const agentInvocationSourceSchema = z.object({
  type: z.literal("schedule"),
  scheduleId: z.string(),
  scheduleName: z.string(),
})

export type AgentScheduleStatus = z.infer<typeof agentScheduleStatusSchema>
export type AgentScheduleCadence = z.infer<typeof agentScheduleCadenceSchema>
export type AgentScheduleCadenceConfig = z.infer<
  typeof agentScheduleCadenceConfigSchema
>
export type AgentSchedule = z.infer<typeof agentScheduleSchema>
export type CreateAgentScheduleRequest = z.infer<
  typeof createAgentScheduleRequestSchema
>
export type UpdateAgentScheduleRequest = z.infer<
  typeof updateAgentScheduleRequestSchema
>
export type AgentInvocationRun = z.infer<typeof agentInvocationRunSchema>
export type AgentInvocationSource = z.infer<typeof agentInvocationSourceSchema>
