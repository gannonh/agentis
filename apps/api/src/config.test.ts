import { describe, expect, it } from "vitest"
import {
  isDebugSeedsEnabled,
  isRunTimelineDebugEnabled,
  isRuntimeAvailable,
  loadConfig,
} from "./config.js"

describe("config", () => {
  it("defaults to production mode when NODE_ENV is unset", () => {
    const config = loadConfig({})

    expect(config.nodeEnv).toBe("production")
    expect(isDebugSeedsEnabled(config)).toBe(false)
  })

  it("enables debug seeds only in development mode", () => {
    const config = loadConfig({ NODE_ENV: "production" })

    expect(isDebugSeedsEnabled(config)).toBe(false)
    expect(isDebugSeedsEnabled({ ...config, nodeEnv: "test" })).toBe(false)
    expect(isDebugSeedsEnabled({ ...config, nodeEnv: "development" })).toBe(
      true
    )
    expect(
      isRunTimelineDebugEnabled({ ...config, nodeEnv: "production" })
    ).toBe(false)
    expect(
      isRunTimelineDebugEnabled({ ...config, nodeEnv: "development" })
    ).toBe(true)
  })

  it("uses selected AI Gateway provider credentials for live runtime availability", () => {
    expect(
      isRuntimeAvailable(
        loadConfig({
          AI_GATEWAY_PROVIDER: "vercel",
          VERCEL_AI_GATEWAY_API_KEY: "vercel-key",
          OPENAI_API_KEY: "",
        })
      )
    ).toBe(true)
    expect(
      isRuntimeAvailable(
        loadConfig({
          AI_GATEWAY_PROVIDER: "vercel",
          AI_GATEWAY_API_KEY: "legacy-vercel-key",
        })
      )
    ).toBe(true)
    expect(
      isRuntimeAvailable(
        loadConfig({
          AI_GATEWAY_PROVIDER: "cloudflare",
          CLOUDFLARE_API_KEY: "cloudflare-key",
          CLOUDFLARE_ACCOUNT_ID: "account-id",
        })
      )
    ).toBe(true)
    expect(
      isRuntimeAvailable(loadConfig({ OPENAI_API_KEY: "openai-key" }))
    ).toBe(false)
    expect(
      isRuntimeAvailable(
        loadConfig({
          AI_GATEWAY_PROVIDER: "cloudflare",
          CLOUDFLARE_API_KEY: "cloudflare-key",
        })
      )
    ).toBe(false)
    expect(isRuntimeAvailable(loadConfig({ AGENTIS_MOCK_RUNTIME: "1" }))).toBe(
      true
    )
  })

  it("defaults AI Gateway provider to Vercel and parses Cloudflare fields", () => {
    const defaultConfig = loadConfig({ AI_GATEWAY_API_KEY: "legacy-key" })
    const cloudflareConfig = loadConfig({
      AI_GATEWAY_PROVIDER: "cloudflare",
      CLOUDFLARE_API_KEY: " cloudflare-key ",
      CLOUDFLARE_ACCOUNT_ID: " account-id ",
      CLOUDFLARE_AI_GATEWAY_ID: " default ",
    })

    expect(defaultConfig.aiGatewayProvider).toBe("vercel")
    expect(defaultConfig.vercelAiGatewayApiKey).toBe("legacy-key")
    expect(defaultConfig.aiGatewayApiKey).toBe("legacy-key")
    expect(cloudflareConfig).toMatchObject({
      aiGatewayProvider: "cloudflare",
      cloudflareApiKey: "cloudflare-key",
      cloudflareAccountId: "account-id",
      cloudflareAiGatewayId: "default",
    })
  })

  it("keeps default Composio toolkit versions keyed by Agentis toolkit slug", () => {
    const config = loadConfig({})

    expect(config.composioToolkitVersions["google-drive"]).toBe("20260519_01")
  })

  it("defaults production sandbox execution to the container backend", () => {
    expect(loadConfig({ NODE_ENV: "production" }).sandboxBackend).toBe(
      "local-container"
    )
    expect(loadConfig({ NODE_ENV: "development" }).sandboxBackend).toBe(
      "local-process"
    )
    expect(
      loadConfig({
        NODE_ENV: "production",
        AGENTIS_SANDBOX_BACKEND: "local-process",
      }).sandboxBackend
    ).toBe("local-process")
  })

  it("applies single-toolkit version overrides by Agentis toolkit slug", () => {
    const config = loadConfig({
      COMPOSIO_TOOLKIT_VERSION_GOOGLE_DRIVE: "20260601_00",
    })

    expect(config.composioToolkitVersions["google-drive"]).toBe("20260601_00")
  })

  it("normalizes JSON toolkit version override keys to Agentis slugs", () => {
    const config = loadConfig({
      COMPOSIO_TOOLKIT_VERSIONS: JSON.stringify({ googledrive: "20260602_00" }),
    })

    expect(config.composioToolkitVersions["google-drive"]).toBe("20260602_00")
  })

  it("falls back to legacy artifact document limit env vars", () => {
    const config = loadConfig({
      AGENTIS_ARTIFACT_MAX_UPLOAD_BYTES: "2048",
      AGENTIS_ARTIFACT_PREVIEW_MAX_CHARS: "128",
    })

    expect(config.documentMaxUploadBytes).toBe(2048)
    expect(config.documentPreviewMaxChars).toBe(128)
  })
})
