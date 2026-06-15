import { describe, expect, it } from "vitest"
import {
  assertValidTimezone,
  cadenceConfigToCronExpression,
  computeNextRunAt,
  ScheduleValidationError,
  validateCronExpression,
  validateScheduleTiming,
} from "./schedule-calculator.js"

describe("schedule-calculator", () => {
  it("computes the next hourly run for the selected minute", () => {
    const nextRunAt = computeNextRunAt({
      cadence: "hourly",
      cadenceConfig: { cadence: "hourly", minute: 15 },
      timezone: "UTC",
      from: new Date("2026-06-14T10:05:00.000Z"),
    })

    expect(nextRunAt).toBe("2026-06-14T10:15:00.000Z")
  })

  it("computes the next daily run in the configured timezone", () => {
    const nextRunAt = computeNextRunAt({
      cadence: "daily",
      cadenceConfig: { cadence: "daily", time: "09:30" },
      timezone: "America/New_York",
      from: new Date("2026-06-14T12:00:00.000Z"),
    })

    expect(nextRunAt).toBe("2026-06-14T13:30:00.000Z")
  })

  it("computes the next weekly run across weekday boundaries", () => {
    const nextRunAt = computeNextRunAt({
      cadence: "weekly",
      cadenceConfig: { cadence: "weekly", weekday: 1, time: "09:00" },
      timezone: "UTC",
      from: new Date("2026-06-14T10:00:00.000Z"),
    })

    expect(nextRunAt).toBe("2026-06-15T09:00:00.000Z")
  })

  it("computes the next custom cron run", () => {
    const nextRunAt = computeNextRunAt({
      cadence: "custom",
      cadenceConfig: { cadence: "custom" },
      cronExpression: "0 */2 * * *",
      timezone: "UTC",
      from: new Date("2026-06-14T10:15:00.000Z"),
    })

    expect(nextRunAt).toBe("2026-06-14T12:00:00.000Z")
  })

  it("rejects invalid cron expressions", () => {
    expect(() =>
      validateCronExpression("not a cron", "UTC")
    ).toThrow(ScheduleValidationError)
    expect(() => validateCronExpression("0 9 * * val", "UTC")).toThrow(
      /not a recognized month or weekday name/i
    )
  })

  it("validates preset cadence timing via validateScheduleTiming", () => {
    expect(() =>
      validateScheduleTiming({
        cadence: "hourly",
        cadenceConfig: { cadence: "hourly", minute: 15 },
        timezone: "UTC",
        cronExpression: "0 9 * * val",
      })
    ).not.toThrow()
  })

  it("rejects invalid timezones", () => {
    expect(() => assertValidTimezone("Not/A_Timezone")).toThrow(
      ScheduleValidationError
    )
  })

  it("converts preset cadences to cron expressions", () => {
    expect(
      cadenceConfigToCronExpression("hourly", {
        cadence: "hourly",
        minute: 5,
      })
    ).toBe("5 * * * *")
    expect(
      cadenceConfigToCronExpression("daily", {
        cadence: "daily",
        time: "08:15",
      })
    ).toBe("15 8 * * *")
    expect(
      cadenceConfigToCronExpression("weekly", {
        cadence: "weekly",
        weekday: 3,
        time: "18:45",
      })
    ).toBe("45 18 * * 3")
  })
})
