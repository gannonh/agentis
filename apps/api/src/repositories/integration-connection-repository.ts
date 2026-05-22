import { and, eq } from "drizzle-orm"
import type {
  ConnectionStatus,
  IntegrationConnection,
} from "@workspace/shared"
import type { AppDatabase } from "../db/client.js"
import { integrationConnections } from "../db/schema.js"
import { createId, nowIso } from "../lib/ids.js"

type ConnectionRow = typeof integrationConnections.$inferSelect

function mapConnection(row: ConnectionRow): IntegrationConnection {
  return {
    id: row.id,
    toolkitSlug: row.toolkitSlug,
    composioConnectedAccountId: row.composioConnectedAccountId ?? undefined,
    composioConnectionRequestId: row.composioConnectionRequestId ?? undefined,
    status: row.status as ConnectionStatus,
    accountLabel: row.accountLabel ?? undefined,
    scopes: row.scopesJson ? (JSON.parse(row.scopesJson) as string[]) : undefined,
    errorCode: row.errorCode ?? undefined,
    errorMessage: row.errorMessage ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export class IntegrationConnectionRepository {
  constructor(
    private readonly db: AppDatabase,
    private readonly userId: string
  ) {}

  create(input: {
    toolkitSlug: string
    status: ConnectionStatus
    composioConnectionRequestId?: string
    composioConnectedAccountId?: string
    accountLabel?: string
    scopes?: string[]
    errorCode?: string
    errorMessage?: string
  }): IntegrationConnection {
    const now = nowIso()
    const row = {
      id: createId("conn"),
      userId: this.userId,
      toolkitSlug: input.toolkitSlug,
      composioConnectedAccountId: input.composioConnectedAccountId ?? null,
      composioConnectionRequestId: input.composioConnectionRequestId ?? null,
      status: input.status,
      accountLabel: input.accountLabel ?? null,
      scopesJson: input.scopes ? JSON.stringify(input.scopes) : null,
      errorCode: input.errorCode ?? null,
      errorMessage: input.errorMessage ?? null,
      createdAt: now,
      updatedAt: now,
    }
    this.db.insert(integrationConnections).values(row).run()
    return mapConnection(row)
  }

  getById(id: string): IntegrationConnection | null {
    const row = this.db
      .select()
      .from(integrationConnections)
      .where(eq(integrationConnections.id, id))
      .get()
    return row ? mapConnection(row) : null
  }

  getByToolkitSlug(toolkitSlug: string): IntegrationConnection | null {
    const row = this.db
      .select()
      .from(integrationConnections)
      .where(
        and(
          eq(integrationConnections.userId, this.userId),
          eq(integrationConnections.toolkitSlug, toolkitSlug)
        )
      )
      .get()
    return row ? mapConnection(row) : null
  }

  getByConnectionRequestId(
    connectionRequestId: string
  ): IntegrationConnection | null {
    const row = this.db
      .select()
      .from(integrationConnections)
      .where(
        eq(
          integrationConnections.composioConnectionRequestId,
          connectionRequestId
        )
      )
      .get()
    return row ? mapConnection(row) : null
  }

  listByUserId(userId: string = this.userId): IntegrationConnection[] {
    return this.db
      .select()
      .from(integrationConnections)
      .where(eq(integrationConnections.userId, userId))
      .all()
      .map(mapConnection)
  }

  listConnectedByUserId(userId: string = this.userId): IntegrationConnection[] {
    return this.listByUserId(userId).filter(
      (connection) => connection.status === "connected"
    )
  }

  countConnectedByToolkit(toolkitSlug: string): number {
    return this.listByUserId().filter(
      (connection) =>
        connection.toolkitSlug === toolkitSlug &&
        connection.status === "connected"
    ).length
  }

  update(
    id: string,
    patch: Partial<{
      status: ConnectionStatus
      composioConnectionRequestId: string
      composioConnectedAccountId: string
      accountLabel: string
      scopes: string[]
      errorCode: string | null
      errorMessage: string | null
    }>
  ): IntegrationConnection | null {
    const existing = this.getById(id)
    if (!existing) return null

    const updatedAt = nowIso()
    this.db
      .update(integrationConnections)
      .set({
        status: patch.status ?? existing.status,
        composioConnectionRequestId:
          patch.composioConnectionRequestId ??
          existing.composioConnectionRequestId ??
          null,
        composioConnectedAccountId:
          patch.composioConnectedAccountId ??
          existing.composioConnectedAccountId ??
          null,
        accountLabel: patch.accountLabel ?? existing.accountLabel ?? null,
        scopesJson: patch.scopes
          ? JSON.stringify(patch.scopes)
          : existing.scopes
            ? JSON.stringify(existing.scopes)
            : null,
        errorCode: patch.errorCode !== undefined ? patch.errorCode : existing.errorCode ?? null,
        errorMessage:
          patch.errorMessage !== undefined
            ? patch.errorMessage
            : existing.errorMessage ?? null,
        updatedAt,
      })
      .where(eq(integrationConnections.id, id))
      .run()

    return this.getById(id)
  }
}
