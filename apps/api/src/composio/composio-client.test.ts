import { describe, expect, it } from "vitest"
import { LiveComposioClient, resolveAuthConfigId } from "./composio-client.js"
import type { AppConfig } from "../config.js"

const config = {
  composioApiKey: "test-key",
  composioToolkitVersions: {},
} as AppConfig

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

describe("LiveComposioClient", () => {
  it("maps transformed toolkit arrays from the Composio SDK", async () => {
    const client = new LiveComposioClient(config)
    ;(client as unknown as { composio: unknown }).composio = {
      toolkits: {
        async get() {
          return [
            {
              slug: "github",
              name: "GitHub",
              description: "Manage repositories",
              categories: [{ name: "Developer" }],
              managedBy: "composio",
            },
          ]
        },
      },
    }

    const result = await client.listToolkits({ featured: true })

    expect(result.items).toEqual([
      expect.objectContaining({
        slug: "github",
        name: "GitHub",
        category: "developer",
        featured: true,
      }),
    ])
  })
})
