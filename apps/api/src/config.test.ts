import { describe, expect, it } from "vitest"
import { loadConfig } from "./config.js"

describe("config", () => {
  it("keeps default Composio toolkit versions keyed by Agentis toolkit slug", () => {
    const config = loadConfig({})

    expect(config.composioToolkitVersions["google-drive"]).toBe("20260519_01")
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
