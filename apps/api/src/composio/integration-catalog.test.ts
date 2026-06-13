import { describe, expect, it } from "vitest"
import type { IntegrationToolkit } from "@workspace/shared"
import { mergeCatalogWithActiveConnections } from "./integration-catalog.js"

function toolkit(slug: string, featured = true): IntegrationToolkit {
  return {
    slug,
    name: slug,
    description: `${slug} integration`,
    category: "developer",
    featured,
    integrationType: "native",
    status: "pending",
    connectedAccountCount: 0,
    availableTools: [],
  }
}

describe("mergeCatalogWithActiveConnections", () => {
  it("appends active toolkits missing from the catalog page", () => {
    const merged = mergeCatalogWithActiveConnections(
      [toolkit("github")],
      ["github", "jira"],
      (slug) => (slug === "jira" ? toolkit("jira", false) : undefined)
    )

    expect(merged.map((item) => item.slug)).toEqual(["github", "jira"])
  })

  it("does not duplicate slugs already in the catalog", () => {
    const merged = mergeCatalogWithActiveConnections(
      [toolkit("github")],
      ["github"],
      () => toolkit("github")
    )

    expect(merged).toHaveLength(1)
  })
})
