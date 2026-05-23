const COMPOSIO_TOOLKIT_SLUG_BY_APP_SLUG: Record<string, string> = {
  "google-drive": "googledrive",
}

const APP_TOOLKIT_SLUG_BY_COMPOSIO_SLUG = Object.fromEntries(
  Object.entries(COMPOSIO_TOOLKIT_SLUG_BY_APP_SLUG).map(([appSlug, composioSlug]) => [
    composioSlug,
    appSlug,
  ])
)

export function toComposioToolkitSlug(appToolkitSlug: string) {
  return COMPOSIO_TOOLKIT_SLUG_BY_APP_SLUG[appToolkitSlug] ?? appToolkitSlug
}

export function toAppToolkitSlug(composioToolkitSlug: string) {
  return APP_TOOLKIT_SLUG_BY_COMPOSIO_SLUG[composioToolkitSlug] ?? composioToolkitSlug
}
