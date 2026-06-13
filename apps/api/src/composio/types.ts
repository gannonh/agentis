import type { ConnectionStatus, IntegrationType } from "@workspace/shared"

export type ComposioAuthorizeResult = {
  connectionRequestId: string
  redirectUrl: string
  connectedAccountId?: string
}

export type ComposioConnectedAccount = {
  id: string
  toolkitSlug: string
  status: ConnectionStatus
  accountLabel?: string
  scopes?: string[]
}

export type ComposioToolExecuteInput = {
  toolSlug: string
  userId: string
  connectedAccountId: string
  arguments: Record<string, unknown>
  version?: string
}

export type ComposioToolExecuteResult = {
  data: unknown
  error?: string
  durationMs: number
}

export type ComposioToolkitSummary = {
  slug: string
  name: string
  description: string
  category: string
  featured: boolean
  integrationType: IntegrationType
  logoUrl?: string
}

export type ComposioListToolkitsInput = {
  search?: string
  category?: string
  featured?: boolean
  limit?: number
  cursor?: string
}

export type ComposioListToolkitsResult = {
  items: ComposioToolkitSummary[]
  nextCursor?: string
}

export interface ComposioClientAdapter {
  authorizeToolkit(
    userId: string,
    toolkitSlug: string,
    callbackUrl: string
  ): Promise<ComposioAuthorizeResult>
  refreshConnectedAccount(
    connectedAccountId: string
  ): Promise<ComposioConnectedAccount>
  listConnectedAccounts(userId: string): Promise<ComposioConnectedAccount[]>
  executeTool(input: ComposioToolExecuteInput): Promise<ComposioToolExecuteResult>
  listToolkits(input: ComposioListToolkitsInput): Promise<ComposioListToolkitsResult>
  getToolkit(toolkitSlug: string): Promise<ComposioToolkitSummary | null>
  listToolkitCategories(): Promise<string[]>
}
