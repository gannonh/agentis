import { describe, expect, it } from "vitest"
import { resolveAuthConfigId } from "./composio-client.js"

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
