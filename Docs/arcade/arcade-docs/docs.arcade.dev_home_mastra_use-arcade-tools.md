---
url: "https://docs.arcade.dev/home/mastra/use-arcade-tools"
title: "Arcade Docs"
---

[Home](https://docs.arcade.dev/home "Home") [Mastra](https://docs.arcade.dev/home/mastra/overview "Mastra") Using Arcade tools

This guide shows you how to integrate and use Arcade tools within a Mastra agent. For the complete working example, check out our [GitHub repository](https://github.com/ArcadeAI/arcade-ai/tree/main/examples/mastra).

### Prerequisites [Permalink for this section](https://docs.arcade.dev/home/mastra/use-arcade-tools\#prerequisites)

- [Obtain an Arcade API key](https://docs.arcade.dev/home/api-keys)
- Basic familiarity with TypeScript and Mastra concepts

### Create a Mastra project [Permalink for this section](https://docs.arcade.dev/home/mastra/use-arcade-tools\#create-a-mastra-project)

Start by creating a new Mastra project using the official CLI:

```nextra-code
# Create a new Mastra project
npx create-mastra@latest my-arcade-agent

# Navigate to the project
cd my-arcade-agent
```

For more details on setting up a Mastra project, refer to the [Mastra documentation](https://mastra.ai/docs/getting-started/installation).

### Install Arcade client [Permalink for this section](https://docs.arcade.dev/home/mastra/use-arcade-tools\#install-arcade-client)

Install the Arcade client:

pnpmnpmyarn

```nextra-code
pnpm add @arcadeai/arcadejs
```

```nextra-code
npm install @arcadeai/arcadejs
```

```nextra-code
yarn install @arcadeai/arcadejs
```

### Configure API keys [Permalink for this section](https://docs.arcade.dev/home/mastra/use-arcade-tools\#configure-api-keys)

Set up your environment with the required API keys:

```nextra-code
// Set your API keys in your environment variables or .env file
process.env.ARCADE_API_KEY = "your_arcade_api_key";
process.env.ANTHROPIC_API_KEY = "your_anthropic_api_key"; // or another supported model provider
```

### Convert Arcade tools to Mastra tools [Permalink for this section](https://docs.arcade.dev/home/mastra/use-arcade-tools\#convert-arcade-tools-to-mastra-tools)

Arcade offers methods to convert tools into Zod schemas, which is essential since Mastra defines tools using Zod. The `toZodToolSet` method is particularly useful, as it simplifies this integration and makes it easier to use Arcade’s tools with Mastra. Learn more about Arcade’s Zod integration options [here](https://docs.arcade.dev/home/use-tools/get-tool-definitions#get-zod-tool-definitions).

```nextra-code
import { Arcade } from "@arcadeai/arcadejs";
import {
	executeOrAuthorizeZodTool,
	toZodToolSet,
} from "@arcadeai/arcadejs/lib";

// Initialize Arcade
const arcade = new Arcade();

// Get Google tools
const googleToolkit = await arcade.tools.list({ toolkit: "google", limit: 30 });
export const googleTools = toZodToolSet({
	tools: googleToolkit.items,
	client: arcade,
	userId: "<YOUR_USER_ID>", // Your app's internal ID for the user (an email, UUID, etc). It's used internally to identify your user in Arcade
	executeFactory: executeOrAuthorizeZodTool, // Checks if tool is authorized and executes it, or returns authorization URL if needed
});

```

### Create and configure your Mastra agent [Permalink for this section](https://docs.arcade.dev/home/mastra/use-arcade-tools\#create-and-configure-your-mastra-agent)

Now create a Mastra agent that uses Arcade tools:

```nextra-code
import { Agent } from "@mastra/core/agent";
import { anthropic } from "@ai-sdk/anthropic";

// Create the Mastra agent with Arcade tools
export const googleAgent = new Agent({
  name: "googleAgent",
  instructions: `You are a Google assistant that helps users manage their Google services (Gmail, Calendar, Sheets, Drive, and Contacts).
  If a tool requires authorization, you will receive an authorization URL.
  When that happens, clearly present this URL to the user and ask them to visit it to grant permissions.`,
  model: anthropic("claude-3-7-sonnet-20250219"),
  tools: googleTools,
});
```

### Interact with your agent [Permalink for this section](https://docs.arcade.dev/home/mastra/use-arcade-tools\#interact-with-your-agent)

You can interact with your agent in two main ways:

**1\. Using the Mastra Development Playground:**

Start the Mastra development server:

```nextra-code
npm run dev
```

This will launch a local development playground, typically accessible at `http://localhost:4111`. Open this URL in your browser, select the `googleAgent` from the list of available agents, and start chatting with it directly in the UI.

**2\. Programmatically:**

Alternatively, you can interact with the agent directly in your code:

```nextra-code
// Generate a response from the agent
const response = await googleAgent.generate(
  "Read my last email and summarize it in a few sentences",
);
console.log(response.text);

// Or stream the response for a more interactive experience
const stream = await googleAgent.stream("Send an email to dev@arcade.dev with the subject 'Hello from Mastra'");

for await (const chunk of stream.textStream) {
  process.stdout.write(chunk);
}
```

⚠️

When running your agent for the first time with tools that require user consent (like Google or Github), the agent will return an authorization reponse (e.g., `{ authorization_required: true, url: '...', message: '...' }`). Your agent’s instructions should guide it to present this URL to the user. After the user visits this URL and grants permissions, the tool can be used successfully. See the [Managing user authorization](https://docs.arcade.dev/home/mastra/user-auth-interrupts) guide for more details on handling authentication flows.

[Overview](https://docs.arcade.dev/home/mastra/overview "Overview") [Managing user authorization](https://docs.arcade.dev/home/mastra/user-auth-interrupts "Managing user authorization")