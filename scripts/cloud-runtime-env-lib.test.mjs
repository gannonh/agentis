import assert from "node:assert/strict"
import {
  cursorInjectionDiagnosis,
  envNameFromRuntimeVariable,
  formatEnvFile,
  materializeEnvFromVariables,
  missingEnvNames,
  runtimeVariableName,
} from "./cloud-runtime-env-lib.mjs"

assert.equal(runtimeVariableName("COMPOSIO_API_KEY"), "AGENTIS_RUNTIME_COMPOSIO_API_KEY")
assert.equal(
  envNameFromRuntimeVariable("AGENTIS_RUNTIME_COMPOSIO_API_KEY"),
  "COMPOSIO_API_KEY"
)

const materialized = materializeEnvFromVariables(
  [
    { name: "AGENTIS_RUNTIME_COMPOSIO_API_KEY", value: "cmp_123" },
    { name: "AGENTIS_RUNTIME_AI_GATEWAY_PROVIDER", value: "cloudflare" },
  ],
  { COMPOSIO_API_KEY: "already-set" }
)
assert.deepEqual(materialized, {
  AI_GATEWAY_PROVIDER: "cloudflare",
})

assert.deepEqual(
  missingEnvNames({ AI_GATEWAY_PROVIDER: "cloudflare" }, [
    "AI_GATEWAY_PROVIDER",
    "COMPOSIO_API_KEY",
  ]),
  ["COMPOSIO_API_KEY"]
)

assert.equal(
  cursorInjectionDiagnosis({
    CURSOR_AGENT: "1",
    CLOUD_AGENT_INJECTED_SECRET_NAMES: "GH_TOKEN",
  }).mode,
  "cursor-injection-partial"
)

assert.match(formatEnvFile({ A: "1", B: "two" }), /A=1\nB=two/)

console.log("cloud-runtime-env-lib.test.mjs: ok")
