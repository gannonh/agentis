import { Composio } from "@composio/core"
import type { ConnectionStatus } from "@workspace/shared"
import type { AppConfig } from "../config.js"
import type {
  ComposioAuthorizeResult,
  ComposioClientAdapter,
  ComposioConnectedAccount,
  ComposioToolExecuteInput,
  ComposioToolExecuteResult,
} from "./types.js"
import { mapComposioAccountStatus } from "./mock-composio-client.js"

function mapConnectionStatus(status: string): ConnectionStatus {
  return mapComposioAccountStatus(status)
}

export class LiveComposioClient implements ComposioClientAdapter {
  private readonly composio: Composio

  constructor(private readonly config: AppConfig) {
    this.composio = new Composio({
      apiKey: config.composioApiKey!,
      toolkitVersions: config.composioToolkitVersions,
    })
  }

  async authorizeToolkit(
    userId: string,
    toolkitSlug: string,
    callbackUrl: string
  ): Promise<ComposioAuthorizeResult> {
    const connectionRequest = await this.composio.toolkits.authorize(
      userId,
      toolkitSlug
    )
    const redirectUrl =
      connectionRequest.redirectUrl ??
      `${callbackUrl}?connectionRequestId=${encodeURIComponent(connectionRequest.id)}`
    return {
      connectionRequestId: connectionRequest.id,
      redirectUrl,
      connectedAccountId:
        "connectedAccountId" in connectionRequest
          ? (connectionRequest as { connectedAccountId?: string })
              .connectedAccountId
          : undefined,
    }
  }

  async refreshConnectedAccount(
    connectedAccountId: string
  ): Promise<ComposioConnectedAccount> {
    const account = await this.composio.connectedAccounts.get(connectedAccountId)
    const toolkitSlug = account.toolkit?.slug ?? "unknown"
    const accountRecord = account as {
      member?: { email?: string; name?: string }
      scopes?: string[]
    }
    return {
      id: account.id,
      toolkitSlug,
      status: mapConnectionStatus(account.status),
      accountLabel:
        accountRecord.member?.email ?? accountRecord.member?.name ?? undefined,
      scopes: accountRecord.scopes,
    }
  }

  async listConnectedAccounts(userId: string): Promise<ComposioConnectedAccount[]> {
    const response = await this.composio.connectedAccounts.list({ userIds: [userId] })
    return response.items.map((account) => {
      const accountRecord = account as {
        member?: { email?: string; name?: string }
        scopes?: string[]
      }
      return {
        id: account.id,
        toolkitSlug: account.toolkit?.slug ?? "unknown",
        status: mapConnectionStatus(account.status),
        accountLabel:
          accountRecord.member?.email ??
          accountRecord.member?.name ??
          undefined,
        scopes: accountRecord.scopes,
      }
    })
  }

  async executeTool(
    input: ComposioToolExecuteInput
  ): Promise<ComposioToolExecuteResult> {
    const started = Date.now()
    const result = await this.composio.tools.execute(input.toolSlug, {
      userId: input.userId,
      connectedAccountId: input.connectedAccountId,
      arguments: input.arguments,
      version: input.version,
    })
    return {
      data: result.data,
      error: result.error ?? undefined,
      durationMs: Date.now() - started,
    }
  }
}

import { MockComposioClient } from "./mock-composio-client.js"

export function createComposioClient(config: AppConfig): ComposioClientAdapter {
  if (config.mockComposio) {
    return new MockComposioClient()
  }
  return new LiveComposioClient(config)
}
