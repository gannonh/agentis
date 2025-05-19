---
url: "https://docs.arcade.dev/home/vercelai/use-arcade-tools"
title: "Arcade Docs"
---

[Home](https://docs.arcade.dev/home "Home") Vercel AIUsing Arcade tools

## Use Arcade with Vercel AI SDK [Permalink for this section](https://docs.arcade.dev/home/vercelai/use-arcade-tools\#use-arcade-with-vercel-ai-sdk)

The [Vercel AI SDK](https://sdk.vercel.ai/) is an open-source library that simplifies the process of building AI-powered applications. It provides a consistent interface for working with various AI providers and includes several useful features:

- Streaming AI responses for real-time interactions
- Framework-agnostic support for React, Next.js, Vue, Nuxt, and SvelteKit.
- Easy switching between AI providers with a single line of code

Let’s supercharge your Vercel AI SDK applications with Arcade’s tools. You’ll get instant access to production-ready tools for working with Google, Slack, GitHub, LinkedIn, and many other popular services, all with built-in authentication. Browse our [complete toolkit catalog](https://docs.arcade.dev/toolkits) to discover what you can build.

In this guide, we’ll show you how to use Arcade’s Google toolkit to create an AI agent that can read and summarize emails. You can find the complete code in our [GitHub repository](https://github.com/ArcadeAI/arcade-ai/tree/main/examples/ai-sdk) or follow along below.

## Getting started [Permalink for this section](https://docs.arcade.dev/home/vercelai/use-arcade-tools\#getting-started)

### Install the required dependencies [Permalink for this section](https://docs.arcade.dev/home/vercelai/use-arcade-tools\#install-the-required-dependencies)

We’ll use the `@ai-sdk/openai` package in this example, but you can use any AI provider supported by the Vercel AI SDK. See the [full list of providers](https://ai-sdk.dev/docs/foundations/providers-and-models#ai-sdk-providers).

pnpmnpmyarn

```nextra-code
pnpm add ai @ai-sdk/openai @arcadeai/arcadejs
```

```nextra-code
npm install ai @ai-sdk/openai @arcadeai/arcadejs
```

```nextra-code
yarn install ai @ai-sdk/openai @arcadeai/arcadejs
```

### Get your API keys and set up environment variables [Permalink for this section](https://docs.arcade.dev/home/vercelai/use-arcade-tools\#get-your-api-keys-and-set-up-environment-variables)

You’ll need two API keys:

- **OpenAI API key** from [OpenAI dashboard](https://platform.openai.com/api-keys)
- **Arcade API key** from our [Getting your API key guide](https://docs.arcade.dev/home/api-keys)

Add them to your environment:

```nextra-code
OPENAI_API_KEY=<YOUR_OPENAI_API_KEY>
ARCADE_API_KEY=<YOUR_ARCADE_API_KEY>
```

### Import Libraries and Initialize Arcade [Permalink for this section](https://docs.arcade.dev/home/vercelai/use-arcade-tools\#import-libraries-and-initialize-arcade)

```nextra-code
import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"
import { Arcade } from "@arcadeai/arcadejs"
import { toZodToolSet, executeOrAuthorizeZodTool } from "@arcadeai/arcadejs/lib"

const arcade = new Arcade()
```

### Get tools from Arcade’s Google toolkit and convert them to Zod [Permalink for this section](https://docs.arcade.dev/home/vercelai/use-arcade-tools\#get-tools-from-arcades-google-toolkit-and-convert-them-to-zod)

Arcade offers methods to convert tools into Zod schemas, which is essential since the Vercel AI SDK defines tools using Zod. The `toZodToolSet` method is particularly useful, as it simplifies this integration and makes it easier to use Arcade’s tools with the Vercel AI SDK. Learn more about Arcade’s Zod integration options [here](https://docs.arcade.dev/home/use-tools/get-tool-definitions#get-zod-tool-definitions).

```nextra-code
// Get Arcade's google toolkit
const googleToolkit = await arcade.tools.list({ toolkit: "google", limit: 30 })
const googleTools = toZodToolSet({
    tools: googleToolkit.items,
    client: arcade,
    userId: "<YOUR_USER_ID>", // Your app's internal ID for the user (an email, UUID, etc). It's used internally to identify your user in Arcade
    executeFactory: executeOrAuthorizeZodTool, // Checks if tool is authorized and executes it, or returns authorization URL if needed
})
```

### Generate text with the tools [Permalink for this section](https://docs.arcade.dev/home/vercelai/use-arcade-tools\#generate-text-with-the-tools)

```nextra-code
const result = await generateText({
    model: openai("gpt-4o-mini"),
    prompt: "Read my last email and summarize it in a few sentences",
    tools: googleTools,
    maxSteps: 5,
})

console.log(result.text)
```

On your first run, you’ll get an authorization message with a link to connect your Google account. Open it in your browser to complete the setup. That’s all you need to do! Arcade will remember your approval for future requests.

You can see the full code in our [GitHub repository](https://github.com/ArcadeAI/arcade-ai/blob/main/examples/ai-sdk/generateText.js).

## Stream the response [Permalink for this section](https://docs.arcade.dev/home/vercelai/use-arcade-tools\#stream-the-response)

Vercel AI SDK supports streaming responses. This creates a more engaging, chat-like experience as the responses appear progressively instead of waiting for the complete answer.

To enable streaming, make these key changes:

1. Import `streamText` instead of `generateText`
2. Use `streamText` to create a streamable response
3. Process the response chunk by chunk

```nextra-code
import { streamText } from "ai"

const { textStream } = streamText({
    model: openai("gpt-4o-mini"),
    prompt: "Read my last email and summarize it in a few sentences",
    tools: googleTools,
    maxSteps: 5,
})

for await (const chunk of textStream) {
    process.stdout.write(chunk)
}
```

You can see the full code in our [GitHub repository](https://github.com/ArcadeAI/arcade-ai/blob/main/examples/ai-sdk/index.js).

## How to use other toolkits [Permalink for this section](https://docs.arcade.dev/home/vercelai/use-arcade-tools\#how-to-use-other-toolkits)

You just need to change the toolkit parameter in the `list` method. For example, to use Slack tools:

```nextra-code
const slackToolkit = await arcade.tools.list({ toolkit: "slack", limit: 30 })
```

Browse our [complete toolkit catalog](https://docs.arcade.dev/toolkits) to see all available toolkits and their capabilities. Each toolkit comes with pre-built tools that are ready to use with your AI applications. Arcade also is the best way to create your own custom tools and toolkits - learn more [here](https://docs.arcade.dev/home/build-tools/create-a-toolkit).

[Managing user authorization](https://docs.arcade.dev/home/mastra/user-auth-interrupts "Managing user authorization") [Use Arcade with Claude Desktop](https://docs.arcade.dev/home/mcp-desktop-clients/claude-desktop-client "Use Arcade with Claude Desktop")