import type { ConnectionStatus } from "@workspace/shared"
import type {
  ComposioAuthorizeResult,
  ComposioClientAdapter,
  ComposioConnectedAccount,
  ComposioToolExecuteInput,
  ComposioToolExecuteResult,
} from "./types.js"
import { CURATED_COMPOSIO_TOOLS } from "./tool-catalog.js"

function mapMockStatus(status: string): ConnectionStatus {
  if (status === "ACTIVE") return "connected"
  if (status === "PENDING") return "pending"
  if (status === "EXPIRED") return "expired"
  return "error"
}

export class MockComposioClient implements ComposioClientAdapter {
  private readonly mockAccounts = new Map<string, ComposioConnectedAccount>()

  async authorizeToolkit(
    userId: string,
    toolkitSlug: string,
    callbackUrl: string
  ): Promise<ComposioAuthorizeResult> {
    const connectionRequestId = `mock-req-${toolkitSlug}-${userId}`
    const connectedAccountId = `mock-acct-${toolkitSlug}-${userId}`
    this.mockAccounts.set(connectedAccountId, {
      id: connectedAccountId,
      toolkitSlug,
      status: "pending",
      accountLabel: `Mock ${toolkitSlug}`,
    })
    const redirect = new URL(callbackUrl)
    redirect.searchParams.set(
      "connectionRequestId",
      connectionRequestId
    )
    redirect.searchParams.set("toolkitSlug", toolkitSlug)
    redirect.searchParams.set("mock", "1")
    const redirectUrl = redirect.toString()
    return { connectionRequestId, redirectUrl, connectedAccountId }
  }

  async refreshConnectedAccount(
    connectedAccountId: string
  ): Promise<ComposioConnectedAccount> {
    const existing = this.mockAccounts.get(connectedAccountId)
    if (!existing) {
      return {
        id: connectedAccountId,
        toolkitSlug: "github",
        status: "connected",
        accountLabel: "Mock account",
        scopes: ["repo"],
      }
    }
    const refreshed: ComposioConnectedAccount = {
      ...existing,
      status: "connected",
      scopes: ["repo"],
    }
    this.mockAccounts.set(connectedAccountId, refreshed)
    return refreshed
  }

  async listConnectedAccounts(userId: string): Promise<ComposioConnectedAccount[]> {
    return [...this.mockAccounts.values()].filter(
      (account) => account.id === `mock-acct-${account.toolkitSlug}-${userId}`
    )
  }

  async executeTool(
    input: ComposioToolExecuteInput
  ): Promise<ComposioToolExecuteResult> {
    const started = Date.now()
    const toolkitSlug = Object.entries(CURATED_COMPOSIO_TOOLS).find(
      ([, value]) => value.toolSlug === input.toolSlug
    )?.[0]

    if (input.toolSlug.includes("GITHUB")) {
      return {
        data: {
          repositories: [
            {
              name: "agentis",
              fullName: "composio/agentis",
              private: false,
            },
          ],
          toolkitSlug: toolkitSlug ?? "github",
          mock: true,
        },
        durationMs: Date.now() - started,
      }
    }

    return {
      data: {
        ok: true,
        toolSlug: input.toolSlug,
        toolkitSlug: toolkitSlug ?? "unknown",
        mock: true,
      },
      durationMs: Date.now() - started,
    }
  }
}

export function mapComposioAccountStatus(status: string): ConnectionStatus {
  return mapMockStatus(status)
}
