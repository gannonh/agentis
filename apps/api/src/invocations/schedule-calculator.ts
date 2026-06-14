import { CronExpressionParser } from "cron-parser"
import {
  agentScheduleCadenceConfigSchema,
  type AgentScheduleCadence,
  type AgentScheduleCadenceConfig,
} from "@workspace/shared"

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

export function validateCronExpression(
  expression: string,
  timezone: string
): void {
  assertValidTimezone(timezone)
  try {
    CronExpressionParser.parse(expression, { tz: timezone })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid cron expression."
    throw new ScheduleValidationError(message)
  }
}

export function computeNextRunAt(input: {
  cadence: AgentScheduleCadence
  cadenceConfig: AgentScheduleCadenceConfig
  timezone: string
  cronExpression?: string | null
  from?: Date
}): string {
  const from = input.from ?? new Date()
  assertValidTimezone(input.timezone)
  const expression = cadenceConfigToCronExpression(
    input.cadence,
    input.cadenceConfig,
    input.cronExpression
  )
  validateCronExpression(expression, input.timezone)
  const interval = CronExpressionParser.parse(expression, {
    tz: input.timezone,
    currentDate: from,
  })
  return interval.next().toDate().toISOString()
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
