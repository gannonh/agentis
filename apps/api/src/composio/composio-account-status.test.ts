import { describe, expect, it } from "vitest"
import { mapComposioAccountStatus } from "./composio-account-status.js"

describe("mapComposioAccountStatus", () => {
  it("maps live Composio in-progress statuses to pending", () => {
    expect(mapComposioAccountStatus("INITIALIZING")).toBe("pending")
    expect(mapComposioAccountStatus("INITIATED")).toBe("pending")
    expect(mapComposioAccountStatus("PENDING")).toBe("pending")
  })

  it("maps terminal Composio statuses", () => {
    expect(mapComposioAccountStatus("ACTIVE")).toBe("connected")
    expect(mapComposioAccountStatus("EXPIRED")).toBe("expired")
    expect(mapComposioAccountStatus("FAILED")).toBe("error")
  })
})
