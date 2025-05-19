---
url: "https://docs.arcade.dev/home/mastra/overview"
title: "Arcade Docs"
---

[Home](https://docs.arcade.dev/home "Home") MastraOverview

## Overview: Arcade Tools in Mastra [Permalink for this section](https://docs.arcade.dev/home/mastra/overview\#overview-arcade-tools-in-mastra)

[Mastra](https://mastra.ai/docs) is an open-source TypeScript agent framework that provides essential primitives for building AI applications. Integrate Arcade’s extensive tool ecosystem to enhance your Mastra agents and enable them to interact seamlessly with numerous third-party services.

This integration enables you to:

- **Access a wide range of tools:** Use Arcade’s [pre-built tools](https://docs.arcade.dev/toolkits) for GitHub, Google Workspace, Slack, and more directly within your Mastra agent.
- **Simplify tool management:** Let Arcade handle the complexities of tool discovery, execution, and authentication.
- **Build sophisticated agents:** Combine Mastra’s agent framework (including memory, workflows, and RAG) with Arcade’s powerful tool capabilities.

### How it Works [Permalink for this section](https://docs.arcade.dev/home/mastra/overview\#how-it-works)

The integration works through three key mechanisms:

1. **Tool Discovery:** Access available tools through a unified API ( `arcade.tools.list`).
2. **Schema Conversion:** Transform Arcade’s tool definitions into Mastra-compatible Zod schemas with the `toZodToolSet` utility, enabling seamless integration between the two frameworks without manual schema mapping.
3. **Execution Delegation:** Seamlessly route tool calls from your Mastra agent through Arcade’s API, which handles all the complexities of third-party service authentication and execution.

Before starting, obtain an [Arcade API key](https://docs.arcade.dev/home/api-keys).

### Next Steps [Permalink for this section](https://docs.arcade.dev/home/mastra/overview\#next-steps)

- Learn how to [use Arcade tools](https://docs.arcade.dev/home/mastra/use-arcade-tools) in a Mastra agent
- Implement [user authentication handling](https://docs.arcade.dev/home/mastra/user-auth-interrupts) for tools in multi-user applications

[Custom auth flow](https://docs.arcade.dev/home/crewai/custom-auth-flow "Custom auth flow") [Using Arcade tools](https://docs.arcade.dev/home/mastra/use-arcade-tools "Using Arcade tools")