import { describe, expect, it } from "vitest"
import {
  isDebugSeedsEnabled,
  isRunTimelineDebugEnabled,
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
    expect(isRunTimelineDebugEnabled({ ...config, nodeEnv: "production" })).toBe(
      false
    )
    expect(isRunTimelineDebugEnabled({ ...config, nodeEnv: "development" })).toBe(
      true
    )
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
})
