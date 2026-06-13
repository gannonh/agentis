import {
  DOCUMENTS_NATIVE_TOOL_CAPABILITY,
  STATIC_ARTIFACTS_NATIVE_TOOL_CAPABILITY,
  APPS_NATIVE_TOOL_CAPABILITY,
  WEB_SEARCH_NATIVE_TOOL_CAPABILITY,
  type NativeToolPermissionId,
} from "@workspace/shared"
import type { ToolSet } from "ai"
import { WebSearchError } from "../research/web-search-provider.js"

export const WEB_SEARCH_SYSTEM_PROMPT =
  "When you use searchWeb, cite the sources you relied on inline using markdown links like [title](url) drawn from the returned results. Do not invent URLs."

export const DOCUMENTS_SYSTEM_PROMPT =
  "Use createDocument when the user asks for a durable document, brief, report, notes, playbook, or library item. If the request has enough context to create useful content, choose a concise title and content instead of asking for schema fields. Search and read relevant documents before updating durable knowledge. Never invent hostnames or placeholder URLs such as yourworkspaceurl. Do not paste viewPath or downloadPath lines in chat; the thread UI already shows document cards, the working artifacts rail, and open links. For durable markdown Documents scoped to Thread, Project or Global, use createDocument — not createWorkspaceFile. To change scope on an existing document, use updateDocumentVisibility with the same documentId; do not create a duplicate document for scope-only requests."

export const RESEARCH_BRIEF_SYSTEM_PROMPT =
  "When the user asks you to research a topic and produce a durable brief or report, call searchWeb at most twice with focused queries, then call createDocument with a markdown brief that synthesizes the findings and cites sources inline using markdown links. Do not paste raw search JSON in chat. Prefer thread-scoped documents unless the user asks for project or global scope."

const DOCUMENT_INTENT_PATTERN =
  /\b(document|brief|report|notes|playbook|summary)\b/i

export const STATIC_ARTIFACTS_SYSTEM_PROMPT =
  "Use createStaticArtifact when the user asks for a static webpage, generated page, slide deck, presentation, or polished visual deck. Use editStaticArtifact for changes to an existing static artifact and findStaticArtifacts before editing when the artifact id is unknown. Use readStaticArtifact before answering questions about what an existing artifact actually contains, including requests for exact slide text, summaries of an artifact, or whether specific content is present. For HTML slide decks, match the requested depth: title-only or outline slides are acceptable when the user asks for an outline, but a full presentation or a request to add detail should include substantive body content on each relevant slide, preferably by providing complete generatedHtml instead of only a terse outline in contentBrief. Do not claim a deck has been expanded or detailed if the artifact still contains only slide titles. Do not paste viewPath or downloadPath lines in chat; the thread UI already shows artifact cards, the working artifacts rail, and open links. Static artifacts are frozen generated outputs and must not depend on runtime Agentis tool access."

export const APPS_SYSTEM_PROMPT =
  "Use createApp when the user asks for an interactive mini-app, form, wizard, calculator, tracker, or visual tool that should run inside Agentis with mutable state. Use editApp for changes to an existing App and findApps before editing when the artifact id is unknown. Do not paste viewPath lines in chat; the thread UI already shows App cards and open links. Do not use createApp for static reports, landing pages, or slide decks; use staticArtifacts instead."

export function looksLikeAppIntent(prompt: string): boolean {
  const appTerm =
    /\b(interactive app|mini-app|mini app|calculator|tracker|form|wizard|form wizard|interactive tool|mutable state app|todo list app|quiz app|note-taking app)\b/i
  const creationOrEditAction =
    /\b(create|make|build|generate|draft|design|edit|update|revise|modify)\b/i
  return appTerm.test(prompt) && creationOrEditAction.test(prompt)
}

export function looksLikeDocumentIntent(prompt: string): boolean {
  return DOCUMENT_INTENT_PATTERN.test(prompt)
}

export function looksLikeWebSearchIntent(prompt: string): boolean {
  return (
    /\b(search|look up|latest|current|web|research|investigate)\b/i.test(
      prompt
    ) &&
    !/\bfiles?\b|workspace file|read .*file|search .*file/i.test(prompt)
  )
}

export function looksLikeResearchBriefIntent(prompt: string): boolean {
  return looksLikeWebSearchIntent(prompt) && looksLikeDocumentIntent(prompt)
}

export function looksLikeStaticArtifactIntent(prompt: string): boolean {
  const artifactTerm =
    /\b(static webpage|webpage|generated page|slide deck|slides|presentation|polished visual deck|visual deck)\b/i
  const creationOrEditAction =
    /\b(create|make|build|generate|draft|design|produce|render|edit|update|revise|modify|polish|turn|convert)\b/i
  return artifactTerm.test(prompt) && creationOrEditAction.test(prompt)
}

type ProviderAvailability = {
  webSearch: boolean
}

type ToolBuilders = {
  webSearch?: () => ToolSet
  documents?: () => ToolSet
  staticArtifacts?: () => ToolSet
  apps?: () => ToolSet
}

export function resolveNativeRuntimeCapabilities(input: {
  permittedNativeToolIds: NativeToolPermissionId[]
  providerAvailability: ProviderAvailability
  latestUserPrompt: string
  buildTools?: ToolBuilders
}) {
  const webSearchPermitted = input.permittedNativeToolIds.includes(
    WEB_SEARCH_NATIVE_TOOL_CAPABILITY.id
  )
  const webSearchRequested = looksLikeWebSearchIntent(input.latestUserPrompt)
  const webSearchAvailable = input.providerAvailability.webSearch
  const webSearchEnabled =
    webSearchPermitted && webSearchRequested && webSearchAvailable
  const unavailableError =
    webSearchPermitted && !webSearchAvailable && webSearchRequested
      ? new WebSearchError(
          "web_search_unavailable",
          "Web search provider is not configured"
        )
      : undefined

  const documentsPermitted = input.permittedNativeToolIds.includes(
    DOCUMENTS_NATIVE_TOOL_CAPABILITY.id
  )
  const documentsEnabled = documentsPermitted
  const staticArtifactsPermitted = input.permittedNativeToolIds.includes(
    STATIC_ARTIFACTS_NATIVE_TOOL_CAPABILITY.id
  )
  const staticArtifactsRequested = looksLikeStaticArtifactIntent(
    input.latestUserPrompt
  )
  const staticArtifactsEnabled =
    staticArtifactsPermitted && staticArtifactsRequested
  const staticArtifactsPermissionDeniedError =
    staticArtifactsRequested && !staticArtifactsPermitted
      ? {
          code: "static_artifact_permission_denied",
          message: "This agent is not permitted to create static artifacts.",
        }
      : undefined

  const appsPermitted = input.permittedNativeToolIds.includes(
    APPS_NATIVE_TOOL_CAPABILITY.id
  )
  const appsRequested = looksLikeAppIntent(input.latestUserPrompt)
  const appsEnabled = appsPermitted && appsRequested
  const appsPermissionDeniedError =
    appsRequested && !appsPermitted
      ? {
          code: "app_permission_denied",
          message: "This agent is not permitted to create Apps.",
        }
      : undefined

  const runtimeTools: ToolSet = {
    ...(webSearchEnabled && input.buildTools?.webSearch
      ? input.buildTools.webSearch()
      : {}),
    ...(documentsEnabled && input.buildTools?.documents
      ? input.buildTools.documents()
      : {}),
    ...(staticArtifactsEnabled && input.buildTools?.staticArtifacts
      ? input.buildTools.staticArtifacts()
      : {}),
    ...(appsEnabled && input.buildTools?.apps ? input.buildTools.apps() : {}),
  }

  const researchBriefRequested = looksLikeResearchBriefIntent(
    input.latestUserPrompt
  )
  const systemPromptSections = [
    webSearchEnabled ? WEB_SEARCH_SYSTEM_PROMPT : null,
    documentsEnabled ? DOCUMENTS_SYSTEM_PROMPT : null,
    webSearchEnabled && documentsEnabled && researchBriefRequested
      ? RESEARCH_BRIEF_SYSTEM_PROMPT
      : null,
    staticArtifactsEnabled ? STATIC_ARTIFACTS_SYSTEM_PROMPT : null,
    appsEnabled ? APPS_SYSTEM_PROMPT : null,
  ].filter((section): section is string => Boolean(section))

  return {
    runtimeTools,
    systemPromptSections,
    webSearch: {
      permitted: webSearchPermitted,
      requested: webSearchRequested,
      enabled: webSearchEnabled,
      unavailableError,
    },
    documents: {
      permitted: documentsPermitted,
      enabled: documentsEnabled,
    },
    staticArtifacts: {
      permitted: staticArtifactsPermitted,
      requested: staticArtifactsRequested,
      enabled: staticArtifactsEnabled,
      permissionDeniedError: staticArtifactsPermissionDeniedError,
    },
    apps: {
      permitted: appsPermitted,
      requested: appsRequested,
      enabled: appsEnabled,
      permissionDeniedError: appsPermissionDeniedError,
    },
  }
}
