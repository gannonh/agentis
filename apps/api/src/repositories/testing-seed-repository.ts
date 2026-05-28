import { inArray } from "drizzle-orm"
import type { AppConfig } from "../config.js"
import type { AppDatabase } from "../db/client.js"
import {
  agentConfigurationVersions,
  agents,
  artifacts,
  integrationConnections,
  messages,
  projectMemories,
  projects,
  runs,
  runSteps,
  savedMemories,
  threads,
  toolAccessGrants,
} from "../db/schema.js"
import { LocalArtifactStorage } from "../artifacts/local-artifact-storage.js"

export type DebugDatasetId =
  | "rich-agent-workspace"
  | "rich-agent-workspace-no-integrations"

export type DebugDatasetSummary = {
  id: DebugDatasetId
  name: string
  description: string
}

export type DebugSeedCounts = {
  agents: number
  projects: number
  threads: number
  artifacts: number
  savedMemories: number
  projectMemories: number
  integrationConnections: number
}

export type DebugSeedResult = {
  dataset: DebugDatasetSummary
  counts: DebugSeedCounts
}

const RICH_WORKSPACE: DebugDatasetSummary = {
  id: "rich-agent-workspace",
  name: "Rich agent workspace",
  description:
    "Seeds five pre-built agents with projects, threads, memories, artifacts, and varied tool access for manual and e2e testing.",
}

const RICH_WORKSPACE_NO_INTEGRATIONS: DebugDatasetSummary = {
  id: "rich-agent-workspace-no-integrations",
  name: "Rich agent workspace, no integrations",
  description:
    "Seeds the same rich workspace without connected integration accounts or tool grants so real connections can be created through the Integrations UI.",
}

const now = "2026-05-22T15:30:00.000Z"
const yesterday = "2026-05-21T15:30:00.000Z"
const lastWeek = "2026-05-15T15:30:00.000Z"

const projectRows = [
  {
    id: "seed_project_agentis_launch",
    name: "Agentis Launch Readiness",
    description:
      "Manual testing project for validating agent configuration, project context, library references, and launch-planning flows.",
    goals:
      "Validate agent setup and edit flows. Exercise project-scoped context in new threads. Confirm artifacts and memories appear where product builders expect them.",
    status: "active",
    archivedAt: null,
    createdAt: lastWeek,
    updatedAt: now,
  },
  {
    id: "seed_project_customer_voice",
    name: "Customer Voice Program",
    description:
      "Research and support workspace for testing knowledge-rich agents with customer feedback, docs, and triage artifacts.",
    goals:
      "Summarize support themes, generate release-note inputs, and keep customer-facing docs aligned with current positioning.",
    status: "active",
    archivedAt: null,
    createdAt: lastWeek,
    updatedAt: yesterday,
  },
]

const projectMemoryRows = [
  {
    id: "seed_project_memory_launch_story",
    projectId: "seed_project_agentis_launch",
    content:
      "The launch narrative should emphasize configurable agents, project memory, and artifact handoff rather than low-level automation internals.",
    enabled: true,
    createdAt: lastWeek,
    updatedAt: now,
  },
  {
    id: "seed_project_memory_acceptance",
    projectId: "seed_project_agentis_launch",
    content:
      "Acceptance evidence should include seeded agents in the sidebar, at least one agent detail page with library items, and seeded threads linked to projects.",
    enabled: true,
    createdAt: lastWeek,
    updatedAt: now,
  },
  {
    id: "seed_project_memory_voice",
    projectId: "seed_project_customer_voice",
    content:
      "Customer-facing summaries should be direct, specific, and organized around user jobs rather than internal feature names.",
    enabled: true,
    createdAt: lastWeek,
    updatedAt: yesterday,
  },
  {
    id: "seed_project_memory_risk",
    projectId: "seed_project_customer_voice",
    content:
      "Flag integration or runtime credential gaps as blockers during manual verification. Do not treat mock output as production evidence.",
    enabled: false,
    createdAt: lastWeek,
    updatedAt: yesterday,
  },
]

const connectionRows = [
  {
    id: "seed_conn_slack",
    userId: "agentis-local-user",
    toolkitSlug: "slack",
    composioConnectedAccountId: "seed-acct-slack",
    composioConnectionRequestId: "seed-req-slack",
    status: "connected",
    accountLabel: "Agentis Product Slack",
    scopesJson: JSON.stringify(["channels:history", "chat:write"]),
    errorCode: null,
    errorMessage: null,
    createdAt: lastWeek,
    updatedAt: now,
  },
  {
    id: "seed_conn_github",
    userId: "agentis-local-user",
    toolkitSlug: "github",
    composioConnectedAccountId: "seed-acct-github",
    composioConnectionRequestId: "seed-req-github",
    status: "connected",
    accountLabel: "agentis/agentis",
    scopesJson: JSON.stringify(["repo", "issues:read", "pull_requests:read"]),
    errorCode: null,
    errorMessage: null,
    createdAt: lastWeek,
    updatedAt: now,
  },
  {
    id: "seed_conn_google_drive",
    userId: "agentis-local-user",
    toolkitSlug: "google-drive",
    composioConnectedAccountId: "seed-acct-drive",
    composioConnectionRequestId: "seed-req-drive",
    status: "connected",
    accountLabel: "Launch Drive",
    scopesJson: JSON.stringify(["drive.readonly", "drive.file"]),
    errorCode: null,
    errorMessage: null,
    createdAt: lastWeek,
    updatedAt: now,
  },
  {
    id: "seed_conn_gmail",
    userId: "agentis-local-user",
    toolkitSlug: "gmail",
    composioConnectedAccountId: "seed-acct-gmail",
    composioConnectionRequestId: "seed-req-gmail",
    status: "connected",
    accountLabel: "demo@agentis.local",
    scopesJson: JSON.stringify(["gmail.readonly", "gmail.compose"]),
    errorCode: null,
    errorMessage: null,
    createdAt: lastWeek,
    updatedAt: yesterday,
  },
  {
    id: "seed_conn_airtable",
    userId: "agentis-local-user",
    toolkitSlug: "airtable",
    composioConnectedAccountId: "seed-acct-airtable",
    composioConnectionRequestId: "seed-req-airtable",
    status: "connected",
    accountLabel: "Customer Insights Base",
    scopesJson: JSON.stringify(["data.records:read", "data.records:write"]),
    errorCode: null,
    errorMessage: null,
    createdAt: lastWeek,
    updatedAt: yesterday,
  },
]

const agentDefinitions = [
  {
    id: "seed_agent_customer_insights",
    versionId: "seed_agent_version_customer_insights_v1",
    name: "Customer Insights Analyst",
    description:
      "Turns support themes, interview notes, and Airtable research records into prioritized product insights.",
    systemPrompt:
      "You are Customer Insights Analyst. Cluster qualitative feedback, preserve customer language, cite source artifacts, and separate validated patterns from hypotheses. Return concise briefs with severity, audience, and recommended follow-up.",
    model: "gpt-4o-mini",
    maxCostPerRunUsd: 1.25,
    sourceThreadId: "seed_thread_customer_voice",
    sourceThreadTitle: "Customer voice synthesis workflow",
    sourceWorkflowJson: JSON.stringify({
      summary:
        "Collect feedback from support threads and research records, cluster themes, and draft prioritized product opportunities.",
      firstUserPrompt:
        "Synthesize the latest customer voice inputs into launch-readiness risks and opportunities.",
    }),
    grants: [
      { toolkitSlug: "airtable", connectionId: "seed_conn_airtable" },
      { toolkitSlug: "slack", connectionId: "seed_conn_slack" },
    ],
  },
  {
    id: "seed_agent_docs_ops",
    versionId: "seed_agent_version_docs_ops_v1",
    name: "Docs Operations Steward",
    description:
      "Maintains help docs, release notes, and implementation guides from product changes and support friction.",
    systemPrompt:
      "You are Docs Operations Steward. Produce clear documentation plans, identify stale claims, and propose user-facing examples. Keep tone concise and flag unknowns that need product confirmation.",
    model: "gpt-4.1-mini",
    maxCostPerRunUsd: 1.1,
    sourceThreadId: "seed_thread_docs_refresh",
    sourceThreadTitle: "Docs refresh from product deltas",
    sourceWorkflowJson: JSON.stringify({
      summary:
        "Review product changes, compare them against docs artifacts, and produce a docs update checklist.",
      firstUserPrompt:
        "Find the docs that need updates for project memory and library artifacts.",
    }),
    grants: [
      { toolkitSlug: "google-drive", connectionId: "seed_conn_google_drive" },
      { toolkitSlug: "github", connectionId: "seed_conn_github" },
    ],
  },
  {
    id: "seed_agent_launch_pm",
    versionId: "seed_agent_version_launch_pm_v1",
    name: "Launch PM Copilot",
    description:
      "Coordinates launch checklists, owner updates, cross-functional risks, and decision logs.",
    systemPrompt:
      "You are Launch PM Copilot. Track decisions, risks, owners, and next actions. Convert messy status into crisp launch updates with blockers and confidence levels.",
    model: "gpt-4o-mini",
    maxCostPerRunUsd: 1.5,
    sourceThreadId: "seed_thread_launch_plan",
    sourceThreadTitle: "Launch planning command workflow",
    sourceWorkflowJson: JSON.stringify({
      summary:
        "Gather project goals, team updates, docs status, and library artifacts into a weekly launch readiness report.",
      firstUserPrompt:
        "Prepare a launch readiness update for the Agentis beta workspace.",
    }),
    grants: [
      { toolkitSlug: "slack", connectionId: "seed_conn_slack" },
      { toolkitSlug: "google-drive", connectionId: "seed_conn_google_drive" },
      { toolkitSlug: "gmail", connectionId: "seed_conn_gmail" },
    ],
  },
  {
    id: "seed_agent_research_librarian",
    versionId: "seed_agent_version_research_librarian_v1",
    name: "Research Librarian",
    description:
      "Builds source-backed briefs from the artifact library, GitHub issues, and external research notes.",
    systemPrompt:
      "You are Research Librarian. Retrieve the strongest available evidence, label source type, and produce structured briefs with citations, open questions, and recommended next searches.",
    model: "gpt-4.1-mini",
    maxCostPerRunUsd: 2,
    sourceThreadId: "seed_thread_research_brief",
    sourceThreadTitle: "Research brief assembly workflow",
    sourceWorkflowJson: JSON.stringify({
      summary:
        "Turn scattered notes and issue context into a sourced research brief with open questions.",
      firstUserPrompt:
        "Create a concise brief about agent configuration patterns we should support first.",
    }),
    grants: [{ toolkitSlug: "github", connectionId: "seed_conn_github" }],
  },
  {
    id: "seed_agent_support_triage",
    versionId: "seed_agent_version_support_triage_v1",
    name: "Support Triage Partner",
    description:
      "Classifies incoming support requests, drafts customer replies, and escalates product bugs with context.",
    systemPrompt:
      "You are Support Triage Partner. Classify urgency, summarize customer impact, draft empathetic replies, and recommend escalation paths. Ask for missing account or reproduction details when needed.",
    model: "gpt-4o-mini",
    maxCostPerRunUsd: 0.75,
    sourceThreadId: "seed_thread_support_triage",
    sourceThreadTitle: "Support escalations triage workflow",
    sourceWorkflowJson: JSON.stringify({
      summary:
        "Classify support issues, connect them to known launch risks, and produce escalation-ready summaries.",
      firstUserPrompt:
        "Triage these three support escalations and draft responses.",
    }),
    grants: [],
  },
]

const threadRows = [
  {
    id: "seed_thread_launch_plan",
    title: "Launch readiness weekly update",
    status: "finished",
    model: "gpt-4o-mini",
    mode: "agent",
    projectId: "seed_project_agentis_launch",
    agentId: "seed_agent_launch_pm",
    agentNameSnapshot: "Launch PM Copilot",
    agentConfigurationVersionId: "seed_agent_version_launch_pm_v1",
    sourceThreadId: null,
    sourceThreadTitle: null,
    sourceWorkflowJson: null,
    createdAt: lastWeek,
    updatedAt: now,
  },
  {
    id: "seed_thread_customer_voice",
    title: "Customer voice synthesis",
    status: "finished",
    model: "gpt-4o-mini",
    mode: "agent",
    projectId: "seed_project_customer_voice",
    agentId: "seed_agent_customer_insights",
    agentNameSnapshot: "Customer Insights Analyst",
    agentConfigurationVersionId: "seed_agent_version_customer_insights_v1",
    sourceThreadId: null,
    sourceThreadTitle: null,
    sourceWorkflowJson: null,
    createdAt: lastWeek,
    updatedAt: yesterday,
  },
  {
    id: "seed_thread_docs_refresh",
    title: "Docs refresh checklist",
    status: "active",
    model: "gpt-4.1-mini",
    mode: "agent",
    projectId: "seed_project_agentis_launch",
    agentId: "seed_agent_docs_ops",
    agentNameSnapshot: "Docs Operations Steward",
    agentConfigurationVersionId: "seed_agent_version_docs_ops_v1",
    sourceThreadId: null,
    sourceThreadTitle: null,
    sourceWorkflowJson: null,
    createdAt: yesterday,
    updatedAt: now,
  },
  {
    id: "seed_thread_research_brief",
    title: "Configuration pattern research brief",
    status: "finished",
    model: "gpt-4.1-mini",
    mode: "agent",
    projectId: "seed_project_agentis_launch",
    agentId: "seed_agent_research_librarian",
    agentNameSnapshot: "Research Librarian",
    agentConfigurationVersionId: "seed_agent_version_research_librarian_v1",
    sourceThreadId: null,
    sourceThreadTitle: null,
    sourceWorkflowJson: null,
    createdAt: lastWeek,
    updatedAt: yesterday,
  },
  {
    id: "seed_thread_support_triage",
    title: "Support escalations triage",
    status: "finished",
    model: "gpt-4o-mini",
    mode: "agent",
    projectId: "seed_project_customer_voice",
    agentId: "seed_agent_support_triage",
    agentNameSnapshot: "Support Triage Partner",
    agentConfigurationVersionId: "seed_agent_version_support_triage_v1",
    sourceThreadId: null,
    sourceThreadTitle: null,
    sourceWorkflowJson: null,
    createdAt: yesterday,
    updatedAt: now,
  },
]

const promptsByThreadId: Record<string, string> = {
  seed_thread_launch_plan:
    "Prepare a weekly launch readiness update with owners, risks, and decisions for the Agentis beta workspace.",
  seed_thread_customer_voice:
    "Synthesize the latest customer voice inputs into product opportunities and launch readiness risks.",
  seed_thread_docs_refresh:
    "Audit the docs artifacts for project memory, library uploads, and agent configuration gaps.",
  seed_thread_research_brief:
    "Create a concise research brief about the agent configuration patterns we should support first.",
  seed_thread_support_triage:
    "Triage these support escalations and draft short customer replies for each case.",
}

const answersByThreadId: Record<string, string> = {
  seed_thread_launch_plan:
    "Launch readiness is on track with two blockers: credential setup needs clearer copy, and seeded data should cover a full workspace. Recommended next action: validate seed and delete flows before the next demo.",
  seed_thread_customer_voice:
    "Top themes: onboarding users need concrete examples, workspace owners want richer agent rosters, and support teams need traceable summaries. Prioritize seed scenarios that make these flows visible.",
  seed_thread_docs_refresh:
    "Docs checklist: add a manual testing data section, document seeded scenario reset steps, and include screenshots after the debugging route ships.",
  seed_thread_research_brief:
    "Configuration patterns to support first: role-specific prompts, connected tools, project context, artifact handoff, and promotion from a successful thread.",
  seed_thread_support_triage:
    "Triage complete. Two issues are documentation gaps, one is a potential integration credential blocker. Draft replies acknowledge impact and request reproduction details where needed.",
}

const artifactRows = [
  {
    id: "seed_artifact_launch_brief",
    title: "Launch readiness brief",
    description: "Weekly launch status with owners, blockers, and confidence notes.",
    type: "document",
    mimeType: "text/markdown",
    sizeBytes: 728,
    storageKey: "debug-seeds/rich-agent-workspace/launch-readiness-brief.md",
    previewText:
      "# Launch readiness brief\n\nStatus: on track. Blockers: credential setup copy and seed scenario coverage. Next: verify debug seeding flow.",
    metadataJson: JSON.stringify({ scenario: "rich-agent-workspace" }),
    projectId: "seed_project_agentis_launch",
    projectNameSnapshot: "Agentis Launch Readiness",
    threadId: "seed_thread_launch_plan",
    threadTitleSnapshot: "Launch readiness weekly update",
    runId: "seed_run_launch_plan",
    agentId: "seed_agent_launch_pm",
    agentNameSnapshot: "Launch PM Copilot",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "seed_artifact_customer_themes",
    title: "Customer themes table",
    description: "Prioritized customer feedback clusters for testing table artifacts.",
    type: "table",
    mimeType: "text/csv",
    sizeBytes: 392,
    storageKey: "debug-seeds/rich-agent-workspace/customer-themes.csv",
    previewText:
      "theme,priority,evidence\nOnboarding examples,high,6 interviews\nAgent rosters,medium,4 support threads",
    metadataJson: JSON.stringify({ scenario: "rich-agent-workspace" }),
    projectId: "seed_project_customer_voice",
    projectNameSnapshot: "Customer Voice Program",
    threadId: "seed_thread_customer_voice",
    threadTitleSnapshot: "Customer voice synthesis",
    runId: "seed_run_customer_voice",
    agentId: "seed_agent_customer_insights",
    agentNameSnapshot: "Customer Insights Analyst",
    createdAt: yesterday,
    updatedAt: yesterday,
  },
  {
    id: "seed_artifact_docs_checklist",
    title: "Docs refresh checklist",
    description: "Documentation tasks for current project memory and library surfaces.",
    type: "document",
    mimeType: "text/markdown",
    sizeBytes: 476,
    storageKey: "debug-seeds/rich-agent-workspace/docs-refresh-checklist.md",
    previewText:
      "- Add debug seeding route notes\n- Update manual testing guide\n- Capture seeded agent screenshots",
    metadataJson: JSON.stringify({ scenario: "rich-agent-workspace" }),
    projectId: "seed_project_agentis_launch",
    projectNameSnapshot: "Agentis Launch Readiness",
    threadId: "seed_thread_docs_refresh",
    threadTitleSnapshot: "Docs refresh checklist",
    runId: "seed_run_docs_refresh",
    agentId: "seed_agent_docs_ops",
    agentNameSnapshot: "Docs Operations Steward",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "seed_artifact_research_brief",
    title: "Agent configuration research brief",
    description: "Source-backed notes on early agent configuration patterns.",
    type: "webpage",
    mimeType: "text/html",
    sizeBytes: 622,
    storageKey: "debug-seeds/rich-agent-workspace/configuration-research.html",
    previewText:
      "Configuration patterns: role-specific prompts, tool access, project context, artifact handoff, and thread promotion.",
    metadataJson: JSON.stringify({ scenario: "rich-agent-workspace" }),
    projectId: "seed_project_agentis_launch",
    projectNameSnapshot: "Agentis Launch Readiness",
    threadId: "seed_thread_research_brief",
    threadTitleSnapshot: "Configuration pattern research brief",
    runId: "seed_run_research_brief",
    agentId: "seed_agent_research_librarian",
    agentNameSnapshot: "Research Librarian",
    createdAt: yesterday,
    updatedAt: yesterday,
  },
  {
    id: "seed_artifact_support_reply_pack",
    title: "Support reply pack",
    description: "Draft customer replies for common onboarding and integration cases.",
    type: "document",
    mimeType: "text/markdown",
    sizeBytes: 584,
    storageKey: "debug-seeds/rich-agent-workspace/support-reply-pack.md",
    previewText:
      "Includes reply drafts for missing credentials, unclear onboarding next steps, and artifact download confusion.",
    metadataJson: JSON.stringify({ scenario: "rich-agent-workspace" }),
    projectId: "seed_project_customer_voice",
    projectNameSnapshot: "Customer Voice Program",
    threadId: "seed_thread_support_triage",
    threadTitleSnapshot: "Support escalations triage",
    runId: "seed_run_support_triage",
    agentId: "seed_agent_support_triage",
    agentNameSnapshot: "Support Triage Partner",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "seed_artifact_launch_slide_notes",
    title: "Launch demo slide notes",
    description: "Slide outline for a manual testing demo with seeded workspace data.",
    type: "slides",
    mimeType: "text/markdown",
    sizeBytes: 438,
    storageKey: "debug-seeds/rich-agent-workspace/launch-demo-slide-notes.md",
    previewText:
      "Slide 1: seeded workspace. Slide 2: agent detail. Slide 3: project context. Slide 4: reset flow.",
    metadataJson: JSON.stringify({ scenario: "rich-agent-workspace" }),
    projectId: "seed_project_agentis_launch",
    projectNameSnapshot: "Agentis Launch Readiness",
    threadId: "seed_thread_launch_plan",
    threadTitleSnapshot: "Launch readiness weekly update",
    runId: "seed_run_launch_plan",
    agentId: "seed_agent_launch_pm",
    agentNameSnapshot: "Launch PM Copilot",
    createdAt: now,
    updatedAt: now,
  },
]

const savedMemoryRows = [
  {
    id: "seed_memory_preference_concise",
    content: "The demo user prefers concise, evidence-backed summaries with blockers called out directly.",
    category: "memory_category_preference",
    usageGuidance: "Apply to generated launch, support, and research summaries.",
    tagsJson: JSON.stringify(["tone", "summaries", "demo"]),
    importance: "high",
    date: "2026-05-22",
    scope: "agent",
    associatedAgent: "seed_agent_support_triage",
    source: "thread-derived",
    sourceThreadId: "seed_thread_support_triage",
    sourceThreadTitle: "Support escalations triage",
    provenance: "Support escalations triage",
    pinnedToContext: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "seed_memory_project_context_launch",
    content: "Agentis is preparing foundation work for manual testing, e2e coverage, project memory, and agent configuration flows.",
    category: "memory_category_project_context",
    usageGuidance: "Use when answering workspace status or launch-readiness prompts.",
    tagsJson: JSON.stringify(["agentis", "launch", "manual-testing"]),
    importance: "high",
    date: "2026-05-22",
    scope: "agent",
    associatedAgent: "seed_agent_launch_pm",
    source: "thread-derived",
    sourceThreadId: "seed_thread_launch_plan",
    sourceThreadTitle: "Launch readiness weekly update",
    provenance: "Launch readiness weekly update",
    pinnedToContext: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "seed_memory_tools_workflows_debug",
    content: "Debug data should be reset through /debug/seeding before manual test passes and e2e suites that need a known workspace.",
    category: "memory_category_tools_workflows",
    usageGuidance: "Mention this when planning verification steps.",
    tagsJson: JSON.stringify(["debug", "seeding", "e2e"]),
    importance: "medium",
    date: "2026-05-21",
    scope: "agent",
    associatedAgent: "seed_agent_launch_pm",
    source: "thread-derived",
    sourceThreadId: "seed_thread_launch_plan",
    sourceThreadTitle: "Launch readiness weekly update",
    provenance: "Launch readiness weekly update",
    pinnedToContext: false,
    createdAt: yesterday,
    updatedAt: yesterday,
  },
  {
    id: "seed_memory_people_design",
    content: "Design reviews focus on restrained workbench UI, functional blue active states, and avoiding unnecessary visual noise.",
    category: "memory_category_people",
    usageGuidance: "Use when drafting UI review checklists or demo notes.",
    tagsJson: JSON.stringify(["design", "review", "workbench"]),
    importance: "medium",
    date: "2026-05-21",
    scope: "agent",
    associatedAgent: "seed_agent_research_librarian",
    source: "thread-derived",
    sourceThreadId: "seed_thread_research_brief",
    sourceThreadTitle: "Configuration pattern research brief",
    provenance: "Configuration pattern research brief",
    pinnedToContext: false,
    createdAt: yesterday,
    updatedAt: yesterday,
  },
  {
    id: "seed_memory_active_work_docs",
    content: "Docs Operations Steward is currently auditing docs for project memory, library uploads, and seed-data reset guidance.",
    category: "memory_category_active_work",
    usageGuidance: "Use when continuing docs-related seeded threads.",
    tagsJson: JSON.stringify(["docs", "active-work"]),
    importance: "medium",
    date: "2026-05-22",
    scope: "agent",
    associatedAgent: "seed_agent_docs_ops",
    source: "thread-derived",
    sourceThreadId: "seed_thread_docs_refresh",
    sourceThreadTitle: "Docs refresh checklist",
    provenance: "Docs refresh checklist",
    pinnedToContext: false,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "seed_memory_domain_onboarding",
    content: "Greenfield onboarding tests should show an empty workspace, then guide users toward creating a first project, first agent, and first useful thread.",
    category: "memory_category_domain_knowledge",
    usageGuidance: "Use as future scenario planning context.",
    tagsJson: JSON.stringify(["onboarding", "future-scenario"]),
    importance: "low",
    date: "2026-05-20",
    scope: "agent",
    associatedAgent: "seed_agent_customer_insights",
    source: "thread-derived",
    sourceThreadId: "seed_thread_customer_voice",
    sourceThreadTitle: "Customer voice synthesis",
    provenance: "Customer voice synthesis",
    pinnedToContext: false,
    createdAt: lastWeek,
    updatedAt: lastWeek,
  },
  {
    id: "seed_memory_org_beta",
    content: "The beta workspace should make agent value visible through realistic agents, connected tools, project context, and reusable deliverables.",
    category: "memory_category_organization",
    usageGuidance: "Use when assessing whether a demo workspace feels complete.",
    tagsJson: JSON.stringify(["beta", "workspace"]),
    importance: "high",
    date: "2026-05-22",
    scope: "agent",
    associatedAgent: "seed_agent_launch_pm",
    source: "thread-derived",
    sourceThreadId: "seed_thread_launch_plan",
    sourceThreadTitle: "Launch readiness weekly update",
    provenance: "Launch readiness weekly update",
    pinnedToContext: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "seed_memory_user_fact_builder",
    content: "The demo user is evaluating Agentis as a builder who wants rich manual test data before feature work lands.",
    category: "memory_category_user_fact",
    usageGuidance: "Use to tailor responses toward product-building and verification needs.",
    tagsJson: JSON.stringify(["demo-user", "builder"]),
    importance: "medium",
    date: "2026-05-22",
    scope: "agent",
    associatedAgent: "seed_agent_customer_insights",
    source: "thread-derived",
    sourceThreadId: "seed_thread_customer_voice",
    sourceThreadTitle: "Customer voice synthesis",
    provenance: "Customer voice synthesis",
    pinnedToContext: false,
    createdAt: now,
    updatedAt: now,
  },
]

const artifactBodies: Record<string, string> = Object.fromEntries(
  artifactRows.map((artifact) => [artifact.storageKey, artifact.previewText])
)

const agentIds = agentDefinitions.map((agent) => agent.id)
const agentVersionIds = agentDefinitions.map((agent) => agent.versionId)
const projectIds = projectRows.map((project) => project.id)
const projectMemoryIds = projectMemoryRows.map((memory) => memory.id)
const connectionIds = connectionRows.map((connection) => connection.id)
const threadIds = threadRows.map((thread) => thread.id)
const runIds = threadRows.map((thread) => `seed_run_${thread.id.replace("seed_thread_", "")}`)
const messageIds = threadRows.flatMap((thread) => [
  `seed_msg_${thread.id.replace("seed_thread_", "")}_user`,
  `seed_msg_${thread.id.replace("seed_thread_", "")}_assistant`,
])
const stepIds = threadRows.flatMap((thread) => [
  `seed_step_${thread.id.replace("seed_thread_", "")}_queued`,
  `seed_step_${thread.id.replace("seed_thread_", "")}_completed`,
])
const artifactIds = artifactRows.map((artifact) => artifact.id)
const savedMemoryIds = savedMemoryRows.map((memory) => memory.id)
const grantIds = [
  ...agentDefinitions.flatMap((agent) =>
    agent.grants.map((grant) => `seed_grant_${agent.id}_${grant.toolkitSlug}`)
  ),
  ...threadRows.flatMap((thread) => {
    const agent = agentDefinitions.find((item) => item.id === thread.agentId)
    return (agent?.grants ?? []).map(
      (grant) => `seed_grant_${thread.id}_${grant.toolkitSlug}`
    )
  }),
]

function countPayload(includeIntegrations: boolean): DebugSeedCounts {
  return {
    agents: agentDefinitions.length,
    projects: projectRows.length,
    threads: threadRows.length,
    artifacts: artifactRows.length,
    savedMemories: savedMemoryRows.length,
    projectMemories: projectMemoryRows.length,
    integrationConnections: includeIntegrations ? connectionRows.length : 0,
  }
}

function resolveDataset(datasetId: string) {
  if (datasetId === RICH_WORKSPACE.id) {
    return { dataset: RICH_WORKSPACE, includeIntegrations: true }
  }
  if (datasetId === RICH_WORKSPACE_NO_INTEGRATIONS.id) {
    return {
      dataset: RICH_WORKSPACE_NO_INTEGRATIONS,
      includeIntegrations: false,
    }
  }
  return null
}

export class TestingSeedRepository {
  constructor(
    private readonly db: AppDatabase,
    private readonly config?: AppConfig
  ) {}

  listDatasets(): DebugDatasetSummary[] {
    return [RICH_WORKSPACE, RICH_WORKSPACE_NO_INTEGRATIONS]
  }

  seed(datasetId: string): DebugSeedResult | null {
    const resolved = resolveDataset(datasetId)
    if (!resolved) return null
    this.deleteRichWorkspace()
    this.insertRichWorkspace(resolved.includeIntegrations)
    return {
      dataset: resolved.dataset,
      counts: countPayload(resolved.includeIntegrations),
    }
  }

  delete(datasetId: string): DebugSeedResult | null {
    const resolved = resolveDataset(datasetId)
    if (!resolved) return null
    this.deleteRichWorkspace()
    return {
      dataset: resolved.dataset,
      counts: countPayload(resolved.includeIntegrations),
    }
  }

  private deleteRichWorkspace() {
    const storage = this.config ? new LocalArtifactStorage(this.config) : null
    for (const artifact of artifactRows) {
      storage?.delete(artifact.storageKey)
    }

    this.db.transaction((tx) => {
      tx.delete(artifacts).where(inArray(artifacts.id, artifactIds)).run()
      tx.delete(toolAccessGrants).where(inArray(toolAccessGrants.id, grantIds)).run()
      tx.delete(runSteps).where(inArray(runSteps.id, stepIds)).run()
      tx.delete(runs).where(inArray(runs.id, runIds)).run()
      tx.delete(messages).where(inArray(messages.id, messageIds)).run()
      tx.delete(threads).where(inArray(threads.id, threadIds)).run()
      tx.delete(agentConfigurationVersions)
        .where(inArray(agentConfigurationVersions.id, agentVersionIds))
        .run()
      tx.delete(agents).where(inArray(agents.id, agentIds)).run()
      tx.delete(savedMemories)
        .where(inArray(savedMemories.id, savedMemoryIds))
        .run()
      tx.delete(projectMemories)
        .where(inArray(projectMemories.id, projectMemoryIds))
        .run()
      tx.delete(projects).where(inArray(projects.id, projectIds)).run()
      tx.delete(integrationConnections)
        .where(inArray(integrationConnections.id, connectionIds))
        .run()
    })
  }

  private insertRichWorkspace(includeIntegrations: boolean) {
    const storage = this.config ? new LocalArtifactStorage(this.config) : null
    for (const [storageKey, body] of Object.entries(artifactBodies)) {
      storage?.write(storageKey, Buffer.from(body, "utf8"))
    }

    this.db.transaction((tx) => {
      tx.insert(projects).values(projectRows).run()
      tx.insert(projectMemories).values(projectMemoryRows).run()
      if (includeIntegrations) {
        tx.insert(integrationConnections)
          .values(
            connectionRows.map((connection) => ({
              ...connection,
              userId: this.config?.composioUserId ?? connection.userId,
            }))
          )
          .run()
      }

      const agentRows = agentDefinitions.map((agent) => ({
        id: agent.id,
        name: agent.name,
        description: agent.description,
        systemPrompt: agent.systemPrompt,
        model: agent.model,
        maxCostPerRunUsd: agent.maxCostPerRunUsd,
        sourceThreadId: agent.sourceThreadId,
        sourceThreadTitle: agent.sourceThreadTitle,
        sourceWorkflowJson: agent.sourceWorkflowJson,
        createdAt: lastWeek,
        updatedAt: now,
      }))
      tx.insert(agents).values(agentRows).run()

      const versionRows = agentDefinitions.map((agent) => ({
        id: agent.versionId,
        agentId: agent.id,
        version: 1,
        systemPrompt: agent.systemPrompt,
        model: agent.model,
        maxCostPerRunUsd: agent.maxCostPerRunUsd,
        toolGrantsJson: JSON.stringify(includeIntegrations ? agent.grants : []),
        createdAt: lastWeek,
      }))
      tx.insert(agentConfigurationVersions).values(versionRows).run()

      const agentGrantRows = includeIntegrations
        ? agentDefinitions.flatMap((agent) =>
            agent.grants.map((grant) => ({
              id: `seed_grant_${agent.id}_${grant.toolkitSlug}`,
              scopeType: "agent",
              scopeId: agent.id,
              toolkitSlug: grant.toolkitSlug,
              connectionId: grant.connectionId,
              createdAt: lastWeek,
            }))
          )
        : []
      if (agentGrantRows.length > 0) {
        tx.insert(toolAccessGrants).values(agentGrantRows).run()
      }

      tx.insert(threads).values(threadRows).run()

      const threadGrantRows = includeIntegrations
        ? threadRows.flatMap((thread) => {
            const agent = agentDefinitions.find(
              (item) => item.id === thread.agentId
            )
            return (agent?.grants ?? []).map((grant) => ({
              id: `seed_grant_${thread.id}_${grant.toolkitSlug}`,
              scopeType: "thread",
              scopeId: thread.id,
              toolkitSlug: grant.toolkitSlug,
              connectionId: grant.connectionId,
              createdAt: thread.createdAt,
            }))
          })
        : []
      if (threadGrantRows.length > 0) {
        tx.insert(toolAccessGrants).values(threadGrantRows).run()
      }

      const messageRows = threadRows.flatMap((thread) => {
        const suffix = thread.id.replace("seed_thread_", "")
        return [
          {
            id: `seed_msg_${suffix}_user`,
            threadId: thread.id,
            role: "user",
            partsJson: JSON.stringify([
              { type: "text", text: promptsByThreadId[thread.id] },
            ]),
            status: "completed",
            createdAt: thread.createdAt,
          },
          {
            id: `seed_msg_${suffix}_assistant`,
            threadId: thread.id,
            role: "assistant",
            partsJson: JSON.stringify([
              { type: "text", text: answersByThreadId[thread.id] },
            ]),
            status: "completed",
            createdAt: thread.updatedAt,
          },
        ]
      })
      tx.insert(messages).values(messageRows).run()

      const runRows = threadRows.map((thread) => ({
        id: `seed_run_${thread.id.replace("seed_thread_", "")}`,
        threadId: thread.id,
        status: thread.status === "finished" ? "completed" : "running",
        model: thread.model,
        agentId: thread.agentId,
        agentConfigurationVersionId: thread.agentConfigurationVersionId,
        startedAt: thread.createdAt,
        finishedAt: thread.status === "finished" ? thread.updatedAt : null,
        errorSummary: null,
        usageJson: JSON.stringify({
          promptTokens: 1200,
          completionTokens: 700,
          totalTokens: 1900,
        }),
        cost: 0.08,
      }))
      tx.insert(runs).values(runRows).run()

      const stepRows = threadRows.flatMap((thread) => {
        const suffix = thread.id.replace("seed_thread_", "")
        const runId = `seed_run_${suffix}`
        return [
          {
            id: `seed_step_${suffix}_queued`,
            runId,
            type: "queued",
            status: "completed",
            title: "Queued",
            payloadJson: null,
            createdAt: thread.createdAt,
            updatedAt: thread.createdAt,
          },
          {
            id: `seed_step_${suffix}_completed`,
            runId,
            type: thread.status === "finished" ? "completed" : "running",
            status: thread.status === "finished" ? "completed" : "running",
            title: thread.status === "finished" ? "Response completed" : "Drafting response",
            payloadJson: JSON.stringify({ scenario: "rich-agent-workspace" }),
            createdAt: thread.updatedAt,
            updatedAt: thread.updatedAt,
          },
        ]
      })
      tx.insert(runSteps).values(stepRows).run()

      tx.insert(artifacts).values(artifactRows).run()
      tx.insert(savedMemories).values(savedMemoryRows).run()
    })
  }
}
