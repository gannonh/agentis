import { createHash } from "node:crypto"
import type {
  AppBundleInput,
  AppMetadata,
  Artifact,
  ArtifactVisibilityScope,
} from "@workspace/shared"
import { appMetadataSchema } from "@workspace/shared"
import type { AppConfig } from "../config.js"
import {
  ArtifactService,
  generatedArtifactVisibilityScope,
} from "../artifacts/artifact-service.js"
import { createId, nowIso } from "../lib/ids.js"
import type { Repositories } from "../repositories/index.js"
import { validateAppBundle } from "./app-bundle-validator.js"
import { LocalAppBundleStorage } from "./local-app-bundle-storage.js"

export const APP_STATE_MAX_BYTES = 65_536

export type AppRunContext = {
  threadId?: string
  projectId?: string
  runId?: string
}

type AppResult<T> = { ok: true; output: T } | AppError

type AppError = {
  ok: false
  code: string
  message: string
  status?: number
  remediation?: string
}

type CreateAppOutput = {
  artifactId: string
  title: string
  version: number
  viewPath: string
  visibilityScope: ArtifactVisibilityScope
  summary: string
}

type EditAppOutput = CreateAppOutput & { previousVersion: number }

type FindAppsOutput = {
  items: Array<{
    artifactId: string
    title: string
    description?: string
    version: number
    viewPath: string
    updatedAt: string
  }>
  resultCount: number
  truncated: boolean
}

type AppVersionMetadataSnapshot = AppMetadata & {
  version: number
  createdAt: string
}

type AppMetadataWithHistory = AppMetadata & {
  versionHistory?: AppVersionMetadataSnapshot[]
}

function appError(
  code: string,
  message: string,
  status = 400,
  remediation?: string
): AppError {
  return { ok: false, code, message, status, remediation }
}

function links(artifactId: string) {
  return { viewPath: `/artifacts/${artifactId}` }
}

function contentHash(content: Buffer | string): string {
  return createHash("sha256").update(content).digest("hex")
}

function buildVersionHistoryEntry(
  version: number,
  metadata: AppMetadata
): AppVersionMetadataSnapshot {
  return {
    ...metadata,
    bundleValidation: {
      ...metadata.bundleValidation,
      warnings: [...metadata.bundleValidation.warnings],
      errors: [...metadata.bundleValidation.errors],
    },
    version,
    createdAt: nowIso(),
  }
}

function parseAppMetadata(artifact: Artifact): AppMetadataWithHistory | null {
  const parsed = appMetadataSchema.safeParse(artifact.metadata)
  if (!parsed.success) return null
  const history = Array.isArray(artifact.metadata?.versionHistory)
    ? (artifact.metadata.versionHistory as AppMetadataWithHistory["versionHistory"])
    : undefined
  return { ...parsed.data, versionHistory: history }
}

function stateByteLength(state: Record<string, unknown>): number {
  return Buffer.byteLength(JSON.stringify(state), "utf8")
}

export class AppService {
  private readonly bundleStorage: LocalAppBundleStorage
  private readonly artifactService: ArtifactService

  constructor(
    private readonly repos: Repositories,
    private readonly config: AppConfig
  ) {
    this.bundleStorage = new LocalAppBundleStorage(config)
    this.artifactService = new ArtifactService(repos)
  }

  createApp(input: {
    title: string
    description?: string
    bundle: AppBundleInput
    initialState?: Record<string, unknown>
    stateSchema?: Record<string, unknown>
    visibilityScope?: ArtifactVisibilityScope
    projectId?: string
    threadId?: string
    runId?: string
  }): AppResult<CreateAppOutput> {
    const prepared = this.prepareBundle(input.bundle, input.stateSchema)
    if (!prepared.ok) return prepared

    const artifactId = createId("artifact")
    const provenance = this.artifactService.captureProvenance({
      projectId: input.projectId,
      threadId: input.threadId,
      runId: input.runId,
    })
    if (!provenance.ok) {
      return appError(
        "app_storage_failed",
        provenance.message,
        provenance.status ?? 400
      )
    }

    const visibilityScope = generatedArtifactVisibilityScope({
      visibilityScope: input.visibilityScope,
      projectId: input.projectId,
    })
    const scopeError = this.artifactService.validateScope(visibilityScope, {
      projectId: input.projectId,
      threadId: provenance.provenance.threadId,
    })
    if (scopeError) {
      return appError("app_storage_failed", scopeError.message, scopeError.status ?? 400)
    }

    if (input.initialState) {
      const stateError = this.validateState(input.initialState)
      if (stateError) return stateError
    }

    const storageKey = this.bundleStorage.storageKey(artifactId, 1)
    const data = Buffer.from(prepared.serialized, "utf8")
    try {
      this.bundleStorage.write(artifactId, 1, input.bundle)
      const metadata = {
        ...prepared.metadata,
        versionHistory: [buildVersionHistoryEntry(1, prepared.metadata)],
      }
      const { artifact } = this.repos.artifacts.createWithInitialVersion({
        id: artifactId,
        title: input.title,
        description: input.description,
        type: "app",
        contentFormat: "json",
        mimeType: "application/json",
        sizeBytes: data.byteLength,
        storageKey,
        previewText: input.title,
        metadata,
        visibilityScope,
        projectId: input.projectId,
        projectNameSnapshot: provenance.provenance.projectNameSnapshot,
        threadId: provenance.provenance.threadId,
        threadTitleSnapshot: provenance.provenance.threadTitleSnapshot,
        runId: input.runId,
        agentId: provenance.provenance.agentId,
        agentNameSnapshot: provenance.provenance.agentNameSnapshot,
        contentHash: contentHash(data),
        contentStorageKey: storageKey,
        changeSummary: "Created app",
        createdByRunId: input.runId,
        createdByThreadId: provenance.provenance.threadId,
      })
      if (input.initialState) {
        try {
          this.repos.appState.upsert(artifactId, input.initialState)
        } catch (stateCause) {
          this.repos.artifacts.deleteById(artifactId)
          this.bundleStorage.delete(storageKey)
          throw stateCause
        }
      }
      return {
        ok: true,
        output: {
          artifactId: artifact.id,
          title: artifact.title,
          version: artifact.currentVersion ?? 1,
          visibilityScope: artifact.visibilityScope,
          summary: "Created interactive App artifact.",
          ...links(artifact.id),
        },
      }
    } catch (cause) {
      this.bundleStorage.delete(storageKey)
      this.repos.artifacts.deleteById(artifactId)
      console.error("Failed to persist app artifact", { cause, artifactId })
      return appError(
        "app_storage_failed",
        "Failed to persist App artifact.",
        500
      )
    }
  }

  editApp(input: {
    artifactId: string
    bundle: AppBundleInput
    changeSummary: string
    runContext: AppRunContext
  }): AppResult<EditAppOutput> {
    const artifact = this.repos.artifacts.getById(input.artifactId)
    if (!artifact || !this.artifactService.canAccess(artifact, input.runContext)) {
      return appError("app_not_found", "App artifact not found.", 404)
    }
    if (artifact.type !== "app") {
      return appError(
        "app_not_found",
        "Only App artifacts can be edited with editApp."
      )
    }
    const existingMetadata = parseAppMetadata(artifact)
    if (!existingMetadata) {
      return appError("app_not_found", "Artifact is missing App metadata.")
    }

    const prepared = this.prepareBundle(input.bundle, existingMetadata.stateSchema)
    if (!prepared.ok) return prepared

    const previousVersion = artifact.currentVersion ?? 0
    const nextVersion = previousVersion + 1
    const storageKey = this.bundleStorage.storageKey(artifact.id, nextVersion)
    const data = Buffer.from(prepared.serialized, "utf8")
    const metadata = {
      ...prepared.metadata,
      stateSchema: existingMetadata.stateSchema,
      versionHistory: [
        ...(existingMetadata.versionHistory ?? [
          buildVersionHistoryEntry(previousVersion, existingMetadata),
        ]),
        buildVersionHistoryEntry(nextVersion, prepared.metadata),
      ],
    }

    try {
      this.bundleStorage.write(artifact.id, nextVersion, input.bundle)
      const updated = this.repos.artifacts.updateWithVersion({
        artifactId: artifact.id,
        version: nextVersion,
        contentHash: contentHash(data),
        contentStorageKey: storageKey,
        changeSummary: input.changeSummary,
        createdByRunId: input.runContext.runId,
        createdByThreadId: input.runContext.threadId,
        sizeBytes: data.byteLength,
        previewText: artifact.previewText ?? artifact.title,
        metadata,
      })
      if (!updated) {
        this.bundleStorage.delete(storageKey)
        return appError("app_not_found", "App artifact not found.", 404)
      }
      return {
        ok: true,
        output: {
          artifactId: updated.id,
          title: updated.title,
          previousVersion,
          version: nextVersion,
          visibilityScope: updated.visibilityScope,
          summary: `Edited App artifact: ${input.changeSummary}`,
          ...links(updated.id),
        },
      }
    } catch (cause) {
      this.bundleStorage.delete(storageKey)
      console.error("Failed to update app artifact", { cause, artifactId: artifact.id })
      return appError(
        "app_storage_failed",
        "Failed to update App artifact.",
        500
      )
    }
  }

  findApps(input: {
    query?: string
    visibilityScope?: ArtifactVisibilityScope
    limit?: number
    runContext: AppRunContext
  }): AppResult<FindAppsOutput> {
    const requestedLimit = input.limit ?? 10
    const limit = Math.min(Math.max(requestedLimit, 1), 50)
    const matches = this.repos.artifacts
      .list({
        query: input.query,
        type: "app",
        visibilityScope: input.visibilityScope,
      })
      .filter((artifact) => this.artifactService.canAccess(artifact, input.runContext))
      .flatMap((artifact) => {
        if (!parseAppMetadata(artifact)) return []
        return [
          {
            artifactId: artifact.id,
            title: artifact.title,
            description: artifact.description ?? undefined,
            version: artifact.currentVersion ?? 1,
            viewPath: links(artifact.id).viewPath,
            updatedAt: artifact.updatedAt,
          },
        ]
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

    return {
      ok: true,
      output: {
        items: matches.slice(0, limit),
        resultCount: matches.length,
        truncated: matches.length > limit,
      },
    }
  }

  getBundle(artifact: Artifact, version?: number): AppBundleInput | null {
    if (artifact.type !== "app") return null
    const resolvedVersion = version ?? artifact.currentVersion ?? 1
    if (version !== undefined) {
      const versionRow = this.repos.artifacts.getVersion(artifact.id, resolvedVersion)
      const storageKey =
        versionRow?.contentStorageKey ??
        (resolvedVersion === (artifact.currentVersion ?? 1)
          ? artifact.storageKey
          : undefined)
      if (!storageKey) return null
      return this.bundleStorage.read(storageKey)
    }
    if (!artifact.storageKey) return null
    return this.bundleStorage.read(artifact.storageKey)
  }

  getState(
    artifactId: string,
    runContext?: AppRunContext
  ): AppResult<{ state: Record<string, unknown> | null; updatedAt: string | null }> {
    const artifact = this.repos.artifacts.getById(artifactId)
    if (!artifact || artifact.type !== "app") {
      return appError("app_not_found", "App artifact not found.", 404)
    }
    if (runContext && !this.artifactService.canAccess(artifact, runContext)) {
      return appError("app_not_found", "App artifact not found.", 404)
    }
    const stored = this.repos.appState.get(artifactId)
    return {
      ok: true,
      output: {
        state: stored?.state ?? null,
        updatedAt: stored?.updatedAt ?? null,
      },
    }
  }

  setState(
    artifactId: string,
    state: Record<string, unknown>,
    runContext?: AppRunContext
  ): AppResult<{ updatedAt: string }> {
    const stateError = this.validateState(state)
    if (stateError) return stateError
    const artifact = this.repos.artifacts.getById(artifactId)
    if (!artifact || artifact.type !== "app") {
      return appError("app_not_found", "App artifact not found.", 404)
    }
    if (runContext && !this.artifactService.canAccess(artifact, runContext)) {
      return appError("app_not_found", "App artifact not found.", 404)
    }
    const stored = this.repos.appState.upsert(artifactId, state)
    return { ok: true, output: { updatedAt: stored.updatedAt } }
  }

  canAccessArtifact(artifact: Artifact, context: AppRunContext): boolean {
    return this.artifactService.canAccess(artifact, context)
  }

  private prepareBundle(
    bundle: AppBundleInput,
    stateSchema?: Record<string, unknown>
  ):
    | { ok: true; serialized: string; metadata: AppMetadata }
    | AppError {
    const validation = validateAppBundle({
      ...bundle,
      maxBytes: this.config.documentMaxUploadBytes,
    })
    if (!validation.ok) return validation

    const metadataResult = appMetadataSchema.safeParse({
      bundleValidation: {
        status: "passed",
        checkedAt: nowIso(),
        warnings: validation.warnings,
        errors: [],
      },
      stateSchema,
    })
    if (!metadataResult.success) {
      return appError(
        "app_storage_failed",
        "Failed to build App metadata.",
        500
      )
    }

    return {
      ok: true,
      serialized: JSON.stringify(bundle),
      metadata: metadataResult.data,
    }
  }

  private validateState(state: Record<string, unknown>): AppError | null {
    if (stateByteLength(state) > APP_STATE_MAX_BYTES) {
      return appError(
        "app_state_too_large",
        "App state exceeds the configured size limit.",
        413,
        "Reduce the App state payload before saving."
      )
    }
    return null
  }
}
