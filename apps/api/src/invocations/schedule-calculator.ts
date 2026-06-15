import { CronExpressionParser } from "cron-parser"
import {
  agentScheduleCadenceConfigSchema,
  type AgentScheduleCadence,
  type AgentScheduleCadenceConfig,
} from "@workspace/shared"

export type { AgentScheduleCadence, AgentScheduleCadenceConfig }

export class ScheduleValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ScheduleValidationError"
  }
}

export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone })
    return true
  } catch {
    return false
  }
}

export function assertValidTimezone(timezone: string): void {
  if (!isValidTimezone(timezone)) {
    throw new ScheduleValidationError(`Invalid timezone: ${timezone}`)
  }
}

export function resolveScheduleCronExpression(input: {
  cadence: AgentScheduleCadence
  cronExpression?: string | null
  existingCronExpression?: string | null
}): string | null {
  if (input.cadence !== "custom") {
    return null
  }
  if (input.cronExpression !== undefined) {
    return input.cronExpression
  }
  return input.existingCronExpression ?? null
}

function scheduleCronExpression(input: {
  cadence: AgentScheduleCadence
  cadenceConfig: AgentScheduleCadenceConfig
  cronExpression?: string | null
}): string {
  return cadenceConfigToCronExpression(
    input.cadence,
    input.cadenceConfig,
    input.cadence === "custom" ? input.cronExpression : null
  )
}

export function cadenceConfigToCronExpression(
  cadence: AgentScheduleCadence,
  cadenceConfig: AgentScheduleCadenceConfig,
  cronExpression?: string | null
): string {
  const parsedConfig = agentScheduleCadenceConfigSchema.parse(cadenceConfig)
  if (parsedConfig.cadence !== cadence) {
    throw new ScheduleValidationError(
      "Cadence config must match the selected cadence."
    )
  }

  switch (parsedConfig.cadence) {
    case "hourly":
      return `${parsedConfig.minute} * * * *`
    case "daily": {
      const [hour, minute] = parseLocalTime(parsedConfig.time)
      return `${minute} ${hour} * * *`
    }
    case "weekly": {
      const [hour, minute] = parseLocalTime(parsedConfig.time)
      return `${minute} ${hour} * * ${parsedConfig.weekday}`
    }
    case "custom": {
      const expression = cronExpression?.trim()
      if (!expression) {
        throw new ScheduleValidationError(
          "Custom schedules require a cron expression."
        )
      }
      return expression
    }
    default:
      throw new ScheduleValidationError("Unsupported schedule cadence.")
  }
}

function formatCronValidationError(error: unknown): string {
  const message =
    error instanceof Error ? error.message : "Invalid cron expression."
  const aliasMatch = message.match(/cannot resolve alias "([^"]+)"/i)
  if (aliasMatch) {
    return `Invalid cron expression: "${aliasMatch[1]}" is not a recognized month or weekday name. Use numbers (0-6 for weekday, 1-12 for month) or abbreviations like MON or JAN.`
  }
  if (message.startsWith("Validation error, ")) {
    return `Invalid cron expression: ${message.slice("Validation error, ".length)}`
  }
  return message.startsWith("Invalid cron")
    ? message
    : `Invalid cron expression: ${message}`
}

function parseCronInterval(
  expression: string,
  timezone: string,
  from: Date
) {
  assertValidTimezone(timezone)
  try {
    return CronExpressionParser.parse(expression, {
      tz: timezone,
      currentDate: from,
    })
  } catch (error) {
    throw new ScheduleValidationError(formatCronValidationError(error))
  }
}

export function validateCronExpression(
  expression: string,
  timezone: string
): void {
  parseCronInterval(expression, timezone, new Date())
}

export function validateScheduleTiming(input: {
  cadence: AgentScheduleCadence
  cadenceConfig: AgentScheduleCadenceConfig
  timezone: string
  cronExpression?: string | null
}): void {
  assertValidTimezone(input.timezone)
  validateCronExpression(
    scheduleCronExpression(input),
    input.timezone
  )
}

export function computeNextRunAt(input: {
  cadence: AgentScheduleCadence
  cadenceConfig: AgentScheduleCadenceConfig
  timezone: string
  cronExpression?: string | null
  from?: Date
}): string {
  const from = input.from ?? new Date()
  const expression = scheduleCronExpression(input)
  return parseCronInterval(expression, input.timezone, from)
    .next()
    .toDate()
    .toISOString()
}

function parseLocalTime(time: string): [number, number] {
  const [hourText, minuteText] = time.split(":")
  const hour = Number(hourText)
  const minute = Number(minuteText)
  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    throw new ScheduleValidationError("Time must use HH:MM in 24-hour format.")
  }
  return [hour, minute]
}
