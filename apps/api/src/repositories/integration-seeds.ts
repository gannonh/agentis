import type { IntegrationType } from "@workspace/shared"

export type MockCatalogToolkit = {
  slug: string
  name: string
  description: string
  category: string
  featured: boolean
  integrationType: IntegrationType
  logoUrl?: string
}

/** Mock Composio catalog fixture used when AGENTIS_MOCK_COMPOSIO=1. */
export const MOCK_COMPOSIO_TOOLKITS: MockCatalogToolkit[] = [
  {
    slug: "slack",
    name: "Slack",
    description: "Send messages and read channel history.",
    category: "communication",
    featured: true,
    integrationType: "native",
  },
  {
    slug: "gmail",
    name: "Gmail",
    description: "Search and draft email on your behalf.",
    category: "communication",
    featured: true,
    integrationType: "native",
  },
  {
    slug: "google-drive",
    name: "Google Drive",
    description: "Browse, upload, and share files.",
    category: "productivity",
    featured: true,
    integrationType: "native",
  },
  {
    slug: "github",
    name: "GitHub",
    description: "Manage repos, issues, and pull requests.",
    category: "developer",
    featured: true,
    integrationType: "native",
  },
  {
    slug: "airtable",
    name: "Airtable",
    description: "Read and write records in Airtable bases.",
    category: "productivity",
    featured: true,
    integrationType: "native",
  },
  {
    slug: "notion",
    name: "Notion",
    description: "Search pages and update workspace content.",
    category: "productivity",
    featured: true,
    integrationType: "native",
  },
  {
    slug: "linear",
    name: "Linear",
    description: "Track issues and project work.",
    category: "developer",
    featured: true,
    integrationType: "native",
  },
  {
    slug: "jira",
    name: "Jira",
    description: "Manage issues, sprints, and boards.",
    category: "developer",
    featured: false,
    integrationType: "native",
  },
  {
    slug: "custom-analytics",
    name: "Custom Analytics MCP",
    description: "Project-managed MCP toolkit for internal analytics.",
    category: "data",
    featured: false,
    integrationType: "mcp",
  },
]

/** @deprecated Use MOCK_COMPOSIO_TOOLKITS for mock catalog; kept for version env keys. */
export const FEATURED_INTEGRATION_TOOLKITS = MOCK_COMPOSIO_TOOLKITS.filter(
  (toolkit) => toolkit.featured
)

export const FEATURED_TOOLKIT_SLUGS = FEATURED_INTEGRATION_TOOLKITS.map(
  (toolkit) => toolkit.slug
)

export const MOCK_TOOLKIT_CATEGORIES = [
  ...new Set(MOCK_COMPOSIO_TOOLKITS.map((toolkit) => toolkit.category)),
].sort()
