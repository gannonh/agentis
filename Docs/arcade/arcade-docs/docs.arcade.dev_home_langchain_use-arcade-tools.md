---
url: "https://docs.arcade.dev/home/langchain/use-arcade-tools"
title: "Arcade Docs"
---

[Home](https://docs.arcade.dev/home "Home") LangChainUsing Arcade tools

## Use LangGraph with Arcade [Permalink for this section](https://docs.arcade.dev/home/langchain/use-arcade-tools\#use-langgraph-with-arcade)

In this guide, let’s explore how to integrate Arcade tools into your LangGraph application. Follow the step-by-step instructions below. For complete working examples, see our [Python](https://github.com/ArcadeAI/arcade-ai/blob/main/examples/langchain/langgraph_arcade_minimal.py) and [JavaScript](https://github.com/ArcadeAI/arcade-ai/blob/main/examples/langchain-ts/langgraph-arcade-minimal.ts) examples.

### Prerequisites [Permalink for this section](https://docs.arcade.dev/home/langchain/use-arcade-tools\#prerequisites)

- [Obtain an Arcade API key](https://docs.arcade.dev/home/api-keys)

### Set up your environment [Permalink for this section](https://docs.arcade.dev/home/langchain/use-arcade-tools\#set-up-your-environment)

Install the required packages, and ensure your environment variables are set with your Arcade and OpenAI API keys:

PythonJavaScript

```nextra-code
pip install langchain-arcade langchain-openai langgraph
```

```nextra-code
npm install @arcadeai/arcadejs @langchain/openai @langchain/core @langchain/langgraph
```

### Configure API keys [Permalink for this section](https://docs.arcade.dev/home/langchain/use-arcade-tools\#configure-api-keys)

Provide your Arcade and OpenAI API keys. You can store them in environment variables or directly in your code:

> Need an Arcade API key? Visit the [Get an API key](https://docs.arcade.dev/home/api-keys) page to create one.

PythonJavaScript

```nextra-code
import os

arcade_api_key = os.environ.get("ARCADE_API_KEY", "YOUR_ARCADE_API_KEY")
openai_api_key = os.environ.get("OPENAI_API_KEY", "YOUR_OPENAI_API_KEY")
```

```nextra-code
ARCADE_API_KEY=<YOUR_ARCADE_API_KEY>
OPENAI_API_KEY=<YOUR_OPENAI_API_KEY>
```

### Create and manage Arcade tools [Permalink for this section](https://docs.arcade.dev/home/langchain/use-arcade-tools\#create-and-manage-arcade-tools)

PythonJavaScript

Use the ArcadeToolManager to retrieve specific tools or entire toolkits:

```nextra-code
from langchain_arcade import ArcadeToolManager

manager = ArcadeToolManager(api_key=arcade_api_key)

# Fetch the "ScrapeUrl" tool from the "Web" toolkit
tools = manager.get_tools(tools=["Web.ScrapeUrl"])
print(manager.tools)

# Get all tools from the "Google" toolkit
tools = manager.get_tools(toolkits=["Google"])
print(manager.tools)
```

Arcade offers methods to convert tools into Zod schemas, which is essential since LangGraph defines tools using Zod. The `toZod` method is particularly useful, as it simplifies this integration and makes it easier to use Arcade’s tools with LangGraph. Learn more about Arcade’s Zod integration options [here](https://docs.arcade.dev/home/use-tools/get-tool-definitions#get-zod-tool-definitions).

```nextra-code
import { Arcade } from "@arcadeai/arcadejs";
import { executeOrAuthorizeZodTool, toZod } from "@arcadeai/arcadejs/lib";
import { tool } from "@langchain/core/tools";

// Initialize the Arcade client
const arcade = new Arcade();

// Get the Arcade tools, you can customize the toolkit (e.g. "github", "notion", "google", etc.)
const googleToolkit = await arcade.tools.list({ toolkit: "google", limit: 30 });
const arcadeTools = toZod({
	tools: googleToolkit.items,
	client: arcade,
	userId: "<YOUR_SYSTEM_USER_ID>", // Replace this with your application's user ID (e.g. email address, UUID, etc.)
});
// Convert Arcade tools to LangGraph tools
const tools = arcadeTools.map(({ name, description, execute, parameters }) =>
	tool(execute, {
		name,
		description,
		schema: parameters,
	}),
);
console.log(tools);
```

### Set up the language model and memory [Permalink for this section](https://docs.arcade.dev/home/langchain/use-arcade-tools\#set-up-the-language-model-and-memory)

Create an AI model and bind your tools. Use MemorySaver for checkpointing:

PythonJavaScript

```nextra-code
from langchain_openai import ChatOpenAI
from langgraph.checkpoint.memory import MemorySaver

model = ChatOpenAI(model="gpt-4o", api_key=openai_api_key)
bound_model = model.bind_tools(tools)

memory = MemorySaver()
```

```nextra-code
import { ChatOpenAI } from "@langchain/openai";
import { MemorySaver } from "@langchain/langgraph";

const model = new ChatOpenAI({ model: "gpt-4o", apiKey: process.env.OPENAI_API_KEY });
const boundModel = model.bindTools(tools);
const memory = new MemorySaver();
```

### Create a ReAct-style agent [Permalink for this section](https://docs.arcade.dev/home/langchain/use-arcade-tools\#create-a-react-style-agent)

Use the prebuilt ReAct agent from LangGraph to handle your Arcade tools:

PythonJavaScript

```nextra-code
from langgraph.prebuilt import create_react_agent

graph = create_react_agent(model=bound_model, tools=tools, checkpointer=memory)
```

```nextra-code
import { createReactAgent } from "@langchain/langgraph/prebuilt";

const graph = createReactAgent({ llm: boundModel, tools, checkpointer: memory });
```

### Provide configuration and user query [Permalink for this section](https://docs.arcade.dev/home/langchain/use-arcade-tools\#provide-configuration-and-user-query)

Supply a basic config dictionary and a user query. Notice that user\_id is required for tool authorization:

PythonJavaScript

```nextra-code
config = {
    "configurable": {
        "thread_id": "1",
        "user_id": "user@example.coom"
    }
}
user_input = {
    "messages": [\
        ("user", "List any new and important emails in my inbox.")\
    ]
}
```

```nextra-code
const config = {
	configurable: {
		thread_id: "1",
		user_id: "user@example.com",
	},
	streamMode: "values" as const,
};
const user_input = {
	messages: [\
		{\
			role: "user",\
			content: "List any new and important emails in my inbox.",\
		},\
	],
};
```

### Stream the response [Permalink for this section](https://docs.arcade.dev/home/langchain/use-arcade-tools\#stream-the-response)

Stream the assistant’s output. If the tool requires authorization, the agent will ask the user to authorize the tool.

PythonJavaScript

```nextra-code
from langgraph.errors import NodeInterrupt

try:
    for chunk in graph.stream(user_input, config, stream_mode="values"):
        chunk["messages"][-1].pretty_print()
except NodeInterrupt as exc:
    print(f"\nNodeInterrupt occurred: {exc}")
    print("Please authorize the tool or update the request, then re-run.")
```

```nextra-code
try {
	const stream = await graph.stream(user_input, config);
	for await (const chunk of stream) {
		console.log(chunk.messages[chunk.messages.length - 1]);
	}
} catch (error) {
	console.error("Error streaming response:", error);
}
```

## Tips for selecting tools [Permalink for this section](https://docs.arcade.dev/home/langchain/use-arcade-tools\#tips-for-selecting-tools)

- **Relevance**: Pick only the tools you need. Avoid using all tools at once.
- **Avoid conflicts**: Be mindful of duplicate or overlapping functionality.

## Next steps [Permalink for this section](https://docs.arcade.dev/home/langchain/use-arcade-tools\#next-steps)

Now that you have integrated Arcade tools into your LangGraph agent, you can:

- Experiment with different toolkits, such as “Math” or “Search.”
- Customize the agent’s prompts for specific tasks.
- Try out other language models and compare their performance.

Enjoy exploring Arcade and building powerful AI-enabled Python applications!

[Modal](https://docs.arcade.dev/home/serve-tools/modal-worker "Modal") [User authorization](https://docs.arcade.dev/home/langchain/user-auth-interrupts "User authorization")