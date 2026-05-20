import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { describe, expect, test } from "vitest"

describe("support-agent Worker deployment config", () => {
  test("defines a deployable Cloudflare preview Worker without secret values", () => {
    const thisDir = path.dirname(fileURLToPath(import.meta.url))
    const config = readFileSync(
      path.resolve(thisDir, "../../wrangler.toml"),
      "utf8"
    )

    expect(config).toContain('name = "agentis-support-agent-preview"')
    expect(config).toContain('main = "src/worker/support-agent-worker.ts"')
    expect(config).toContain("[env.preview]")
    expect(config).toContain("[env.preview.vars]")
    expect(config).toContain('SUPPORT_AGENT_PROVIDER = "openai"')
    expect(config).toContain('SUPPORT_AGENT_MODEL = "gpt-5.4-mini"')
    expect(config).not.toContain("SUPPORT_AGENT_OPENAI_API_KEY =")
    expect(config).not.toContain("SUPPORT_AGENT_DEPLOYMENT_SECRET =")
    expect(config).not.toContain("sk-")
    expect(config).toContain("[[ai_search_namespaces]]")
    expect(config).toContain('binding = "SUPPORT_AGENT_AI_SEARCH"')
    expect(config).not.toMatch(/^\s*binding = "SUPPORT_AGENT_AI_SEARCH"/m)
  })
})
