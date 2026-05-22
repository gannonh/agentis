export const FEATURED_INTEGRATION_TOOLKITS = [
  {
    slug: "slack",
    name: "Slack",
    description: "Send messages and read channel history.",
    category: "communication",
  },
  {
    slug: "gmail",
    name: "Gmail",
    description: "Search and draft email on your behalf.",
    category: "communication",
  },
  {
    slug: "google-drive",
    name: "Google Drive",
    description: "Browse, upload, and share files.",
    category: "productivity",
  },
  {
    slug: "github",
    name: "GitHub",
    description: "Manage repos, issues, and pull requests.",
    category: "developer",
  },
  {
    slug: "airtable",
    name: "Airtable",
    description: "Read and write records in Airtable bases.",
    category: "productivity",
  },
] as const

export const FEATURED_TOOLKIT_SLUGS = FEATURED_INTEGRATION_TOOLKITS.map(
  (toolkit) => toolkit.slug
)
