import { readFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, test } from "vitest"

describe("support-agent Worker deployment config", () => {
  test("defines a deployable Cloudflare preview Worker without secret values", () => {
    const config = readFileSync(path.resolve("wrangler.toml"), "utf8")

    expect(config).toContain('name = "agentis-support-agent-preview"')
    expect(config).toContain('main = "src/worker/support-agent-worker.ts"')
    expect(config).toContain("[env.preview]")
    expect(config).toContain("[env.preview.vars]")
    expect(config).toContain('SUPPORT_AGENT_PROVIDER = "openai"')
    expect(config).toContain('SUPPORT_AGENT_MODEL = "gpt-5.4-mini"')
    expect(config).not.toContain("SUPPORT_AGENT_OPENAI_API_KEY =")
    expect(config).not.toContain("SUPPORT_AGENT_DEPLOYMENT_SECRET =")
    expect(config).not.toContain("sk-")
  })
})
