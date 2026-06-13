import { describe, expect, it } from "vitest"
import { resolveAuthConfigId } from "./composio-client.js"
import { mapComposioAccountStatus } from "./mock-composio-client.js"

describe("mapComposioAccountStatus", () => {
  it("maps live Composio in-progress statuses to pending", () => {
    expect(mapComposioAccountStatus("INITIALIZING")).toBe("pending")
    expect(mapComposioAccountStatus("INITIATED")).toBe("pending")
    expect(mapComposioAccountStatus("PENDING")).toBe("pending")
  })

  it("maps active and expired Composio statuses", () => {
    expect(mapComposioAccountStatus("ACTIVE")).toBe("connected")
    expect(mapComposioAccountStatus("EXPIRED")).toBe("expired")
    expect(mapComposioAccountStatus("FAILED")).toBe("error")
  })
})

describe("resolveAuthConfigId", () => {
  it("does not reuse an auth config for a different toolkit", async () => {
    const created: { toolkit: string; name: string }[] = []
    const composio = {
      authConfigs: {
        async list() {
          return {
            items: [
              {
                id: "auth-github",
                toolkit: { slug: "github" },
              },
            ],
          }
        },
        async create(toolkit: string, input: { name: string }) {
          created.push({ toolkit, name: input.name })
          return { id: "auth-google-drive" }
        },
      },
      toolkits: {
        async get(toolkit: string) {
          return {
            name: toolkit === "googledrive" ? "Google Drive" : toolkit,
            authConfigDetails: [{}],
          }
        },
        async listCategories() {
          return { items: [], nextCursor: null, totalPages: 0 }
        },
      },
    }

    const authConfigId = await resolveAuthConfigId(
      composio,
      "google-drive"
    )

    expect(authConfigId).toBe("auth-google-drive")
    expect(created).toEqual([
      { toolkit: "googledrive", name: "Google Drive Auth Config" },
    ])
  })
})
