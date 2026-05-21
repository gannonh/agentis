import { tool } from "ai"
import { z } from "zod"

export const getWorkspaceSummaryTool = tool({
  description:
    "Returns a concise summary of the demo Agentis workspace for planning and status checks.",
  inputSchema: z.object({
    focus: z
      .enum(["agents", "threads", "integrations", "overview"])
      .default("overview"),
  }),
  execute: async ({ focus }) => {
    const summary = {
      agents: 6,
      activeAgents: 4,
      threads: 1,
      integrationsConnected: 2,
      pendingAttention: 3,
    }

    if (focus === "agents") {
      return {
        focus,
        agents: summary.agents,
        activeAgents: summary.activeAgents,
      }
    }

    if (focus === "threads") {
      return { focus, threads: summary.threads }
    }

    if (focus === "integrations") {
      return {
        focus,
        integrationsConnected: summary.integrationsConnected,
      }
    }

    return { focus: "overview", ...summary }
  },
})
