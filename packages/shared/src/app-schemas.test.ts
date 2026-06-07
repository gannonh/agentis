import { describe, expect, it } from "vitest"
import {
  appBundleInputSchema,
  appErrorCodeSchema,
  createAppInputSchema,
  createAppOutputSchema,
  editAppInputSchema,
  findAppsInputSchema,
  findAppsOutputSchema,
} from "./app-schemas.js"

describe("app schemas", () => {
  it("accepts a minimal createApp input", () => {
    const parsed = createAppInputSchema.safeParse({
      title: "Calculator",
      bundle: {
        html: "<main><h1>Calc</h1></main>",
        js: "console.log('ready')",
      },
    })
    expect(parsed.success).toBe(true)
  })

  it("requires html and js in app bundles", () => {
    expect(
      appBundleInputSchema.safeParse({ html: "<main></main>" }).success
    ).toBe(false)
    expect(
      appBundleInputSchema.safeParse({ js: "console.log('x')" }).success
    ).toBe(false)
  })

  it("validates createApp output viewPath shape", () => {
    const parsed = createAppOutputSchema.safeParse({
      artifactId: "artifact_1",
      title: "Calculator",
      version: 1,
      viewPath: "/artifacts/artifact_1",
      visibilityScope: "thread",
      summary: "Created app.",
    })
    expect(parsed.success).toBe(true)
  })

  it("validates editApp output with previousVersion", () => {
    const parsed = editAppInputSchema.safeParse({
      artifactId: "artifact_1",
      bundle: {
        html: "<main></main>",
        js: "console.log('v2')",
      },
      changeSummary: "Added styling",
    })
    expect(parsed.success).toBe(true)
  })

  it("bounds findApps limit", () => {
    expect(findAppsInputSchema.safeParse({ limit: 51 }).success).toBe(false)
    expect(findAppsInputSchema.safeParse({ limit: 10 }).success).toBe(true)
  })

  it("exports app error codes used by runtime", () => {
    expect(appErrorCodeSchema.options).toContain("app_permission_denied")
    expect(appErrorCodeSchema.options).toContain("app_invalid_bundle")
    expect(appErrorCodeSchema.options).toContain("app_state_too_large")
  })

  it("validates findApps output items", () => {
    const parsed = findAppsOutputSchema.safeParse({
      items: [
        {
          artifactId: "artifact_1",
          title: "Calc",
          version: 1,
          viewPath: "/artifacts/artifact_1",
          updatedAt: "2026-06-07T00:00:00.000Z",
        },
      ],
      resultCount: 1,
      truncated: false,
    })
    expect(parsed.success).toBe(true)
  })
})
