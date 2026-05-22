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

async function resolveAuthConfigId(
  composio: Composio,
  toolkitSlug: string
): Promise<string> {
  const listed = await composio.authConfigs.list({ toolkit: toolkitSlug })
  let authConfigId = listed.items[0]?.id

  if (authConfigId) return authConfigId

  const toolkit = await composio.toolkits.get(toolkitSlug)
  if (!toolkit.authConfigDetails?.length) {
    throw new Error(`No auth configs found for toolkit ${toolkitSlug}`)
  }

  const created = await composio.authConfigs.create(toolkitSlug, {
    type: "use_composio_managed_auth",
    name: `${toolkit.name} Auth Config`,
  })
  return created.id
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
    const callback = new URL(callbackUrl)
    callback.searchParams.set("toolkitSlug", toolkitSlug)

    const authConfigId = await resolveAuthConfigId(this.composio, toolkitSlug)
    const connectionRequest = await this.composio.connectedAccounts.link(
      userId,
      authConfigId,
      {
        callbackUrl: callback.toString(),
        allowMultiple: true,
      }
    )

    const redirectUrl = connectionRequest.redirectUrl
    if (!redirectUrl) {
      throw new Error("Composio did not return a redirect URL for connection")
    }

    const linked = connectionRequest as {
      id: string
      connectedAccountId?: string
    }

    return {
      connectionRequestId: linked.id,
      redirectUrl,
      connectedAccountId: linked.connectedAccountId ?? linked.id,
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
    try {
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
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Composio tool execution failed"
      return {
        data: undefined,
        error: message,
        durationMs: Date.now() - started,
      }
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
