#!/usr/bin/env node

import fs from "node:fs"

import {
  createAiSdkOpenAiTextGenerator,
  createSupportAgentEvalReport,
  runSupportAgentModelCandidateEvals,
  supportAgentEvalQuestions,
} from "../src/lib/support-agent/index.ts"

const command = "pnpm --filter web support-agent:eval"
const env = process.env
const apiKey = env.SUPPORT_AGENT_EVAL_OPENAI_API_KEY ?? env.OPENAI_API_KEY
const modelA = env.SUPPORT_AGENT_EVAL_MODEL_A ?? "gpt-5-mini"
const modelB = env.SUPPORT_AGENT_EVAL_MODEL_B ?? "gpt-5.1-mini"
const outputPath = env.SUPPORT_AGENT_EVAL_OUTPUT
const candidateModels = [`openai:${modelA}`, `openai:${modelB}`]

const candidates = [
  {
    id: `openai-${modelA}`,
    label: modelA,
    provider: { provider: "openai", model: modelA, apiKey },
    generateText: createAiSdkOpenAiTextGenerator(),
    costNote:
      env.SUPPORT_AGENT_EVAL_COST_NOTE_A ??
      "Record provider billing dashboard usage after the run.",
  },
  {
    id: `openai-${modelB}`,
    label: modelB,
    provider: { provider: "openai", model: modelB, apiKey },
    generateText: createAiSdkOpenAiTextGenerator(),
    costNote:
      env.SUPPORT_AGENT_EVAL_COST_NOTE_B ??
      "Record provider billing dashboard usage after the run.",
  },
]

try {
  const run = await runSupportAgentModelCandidateEvals({
    candidates,
    questions: supportAgentEvalQuestions,
  })
  const report = createSupportAgentEvalReport({
    generatedAt: new Date().toISOString(),
    questions: supportAgentEvalQuestions,
    run,
    execution: {
      completed: true,
      command,
      credentialState: "configured",
      notes: "Live run completed through the Agentis support-agent runtime boundary.",
    },
  })
  const output = `${JSON.stringify(report, null, 2)}\n`

  if (outputPath) {
    fs.writeFileSync(outputPath, output)
    console.log(`Wrote support-agent eval report to ${outputPath}`)
  } else {
    process.stdout.write(output)
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  const failureRecord = {
    completed: false,
    command,
    candidateModels,
    credentialState: apiKey ? "configured" : "missing",
    notes: message,
  }

  console.error("Support-agent eval run failed.")
  console.error(JSON.stringify(failureRecord, null, 2))
  process.exitCode = 1
}
