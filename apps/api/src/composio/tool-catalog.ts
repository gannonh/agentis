export const CURATED_COMPOSIO_TOOLS: Record<
  string,
  { toolSlug: string; description: string }
> = {
  github: {
    toolSlug: "GITHUB_LIST_REPOSITORIES_FOR_THE_AUTHENTICATED_USER",
    description: "List repositories for the connected GitHub account",
  },
  slack: {
    toolSlug: "SLACK_LIST_ALL_CHANNELS",
    description: "List Slack channels for the connected workspace",
  },
  gmail: {
    toolSlug: "GMAIL_LIST_LABELS",
    description: "List Gmail labels for the connected account",
  },
  "google-drive": {
    toolSlug: "GOOGLEDRIVE_LIST_FILES",
    description: "List files in Google Drive",
  },
  airtable: {
    toolSlug: "AIRTABLE_LIST_BASES",
    description: "List Airtable bases",
  },
}

export const SUPPORTED_TOOLKIT_NAMES: Record<string, string> = {
  slack: "Slack",
  gmail: "Gmail",
  "google-drive": "Google Drive",
  github: "GitHub",
  airtable: "Airtable",
}

export function getCuratedToolSlug(toolkitSlug: string): string | undefined {
  return CURATED_COMPOSIO_TOOLS[toolkitSlug]?.toolSlug
}

export function listAvailableToolsForToolkit(toolkitSlug: string): string[] {
  const curated = CURATED_COMPOSIO_TOOLS[toolkitSlug]
  return curated ? [curated.toolSlug] : []
}
