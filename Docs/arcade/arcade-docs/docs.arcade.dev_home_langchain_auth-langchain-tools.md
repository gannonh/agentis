---
url: "https://docs.arcade.dev/home/langchain/auth-langchain-tools"
title: "Arcade Docs"
---

[Home](https://docs.arcade.dev/home "Home") [LangChain](https://docs.arcade.dev/home/langchain/use-arcade-tools "LangChain") Authorizing existing tools

## Authorize Existing Tools [Permalink for this section](https://docs.arcade.dev/home/langchain/auth-langchain-tools\#authorize-existing-tools)

In this guide, we’ll show you how to authorize LangChain tools like the `GmailToolkit` using Arcade. You may already have tools you want to use, and this guide will show you how to authorize them. Arcade handles retrieving, authorizing, and managing tokens so you don’t have to. For complete working examples, see our [Python](https://github.com/ArcadeAI/arcade-ai/blob/main/examples/langchain/langchain_tool_arcade_auth.py) and [JavaScript](https://github.com/ArcadeAI/arcade-ai/blob/main/examples/langchain-ts/langchain-tool-arcade-auth.ts) examples.

### Prerequisites [Permalink for this section](https://docs.arcade.dev/home/langchain/auth-langchain-tools\#prerequisites)

- [Obtain an Arcade API key](https://docs.arcade.dev/home/api-keys)

### Install the required packages [Permalink for this section](https://docs.arcade.dev/home/langchain/auth-langchain-tools\#install-the-required-packages)

Instead of the `langchain_arcade` package, you only need the `arcadepy` package to authorize existing tools since Arcade tools are not being used.

PythonJavaScript

```nextra-code
pip install langchain-openai langgraph arcadepy langchain-google-community
```

```nextra-code
npm install @arcadeai/arcadejs @langchain/openai @langchain/core @langchain/langgraph @langchain/community
```

### Import the necessary packages [Permalink for this section](https://docs.arcade.dev/home/langchain/auth-langchain-tools\#import-the-necessary-packages)

PythonJavaScript

```nextra-code
import os
from arcadepy import Arcade
from google.oauth2.credentials import Credentials
from langchain_google_community import GmailToolkit
from langchain_google_community.gmail.utils import build_resource_service
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent
```

```nextra-code
import { Arcade } from "@arcadeai/arcadejs";
import {
	GmailCreateDraft,
	GmailGetMessage,
	GmailGetThread,
	GmailSearch,
	GmailSendMessage,
} from "@langchain/community/tools/gmail";
import type { StructuredTool } from "@langchain/core/tools";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
```

### Initialize the Arcade client [Permalink for this section](https://docs.arcade.dev/home/langchain/auth-langchain-tools\#initialize-the-arcade-client)

PythonJavaScript

```nextra-code
api_key = os.getenv("ARCADE_API_KEY")
client = Arcade(api_key=api_key)
```

```nextra-code
const arcade = new Arcade();
```

### Start the authorization process for Gmail [Permalink for this section](https://docs.arcade.dev/home/langchain/auth-langchain-tools\#start-the-authorization-process-for-gmail)

PythonJavaScript

```nextra-code
user_id = "user@example.com"
auth_response = client.auth.start(
    user_id=user_id,
    provider="google",
    scopes=["https://www.googleapis.com/auth/gmail.readonly"],
)
```

```nextra-code
const USER_ID = "user@example.com";
const authResponse = await arcade.auth.start(USER_ID, "google", {
	scopes: ["https://www.googleapis.com/auth/gmail.readonly"],
});

```

### Prompt the user to authorize [Permalink for this section](https://docs.arcade.dev/home/langchain/auth-langchain-tools\#prompt-the-user-to-authorize)

PythonJavaScript

```nextra-code
if auth_response.status != "completed":
    print("Please authorize the application in your browser:")
    print(auth_response.url)
```

The `auth_response.status` will be `"completed"` if the user has already authorized the application, so they won’t be prompted to authorize again.

```nextra-code
if (authResponse.status !== "completed") {
	console.log("Please authorize the application in your browser:");
	console.log(authResponse.url);
}
```

The `authResponse.status` will be `"completed"` if the user has already authorized the application, so they won’t be prompted to authorize again.

### Wait for authorization completion [Permalink for this section](https://docs.arcade.dev/home/langchain/auth-langchain-tools\#wait-for-authorization-completion)

PythonJavaScript

```nextra-code
auth_response = client.auth.wait_for_completion(auth_response)
```

The `wait_for_completion` method will do nothing if the user has already authorized the application.

```nextra-code
const completedAuth = await arcade.auth.waitForCompletion(authResponse);
```

The `waitForCompletion` method will do nothing if the user has already authorized the application.

### Use the token to initialize the Gmail toolkit [Permalink for this section](https://docs.arcade.dev/home/langchain/auth-langchain-tools\#use-the-token-to-initialize-the-gmail-toolkit)

PythonJavaScript

```nextra-code
creds = Credentials(auth_response.context.token)
api_resource = build_resource_service(credentials=creds)
toolkit = GmailToolkit(api_resource=api_resource)
tools = toolkit.get_tools()
```

```nextra-code
const gmailParam = {
	credentials: {
		accessToken: completedAuth.context.token,
	},
};
const tools: StructuredTool[] = [\
	new GmailCreateDraft(gmailParam),\
	new GmailGetMessage(gmailParam),\
	new GmailGetThread(gmailParam),\
	new GmailSearch(gmailParam),\
	new GmailSendMessage(gmailParam),\
];
```

### Initialize the agent [Permalink for this section](https://docs.arcade.dev/home/langchain/auth-langchain-tools\#initialize-the-agent)

PythonJavaScript

```nextra-code
model = ChatOpenAI(model="gpt-4o")
agent_executor = create_react_agent(model, tools)
```

```nextra-code
const llm = new ChatOpenAI({ model: "gpt-4o" });
const agent_executor = createReactAgent({ llm, tools });
```

### Execute the agent [Permalink for this section](https://docs.arcade.dev/home/langchain/auth-langchain-tools\#execute-the-agent)

PythonJavaScript

```nextra-code
example_query = "Read my latest emails and summarize them."

events = agent_executor.stream(
    {"messages": [("user", example_query)]},
    stream_mode="values",
)
for event in events:
    event["messages"][-1].pretty_print()
```

```nextra-code
const exampleQuery = "Read my latest emails and summarize them.";
const events = await agent_executor.stream({ messages: [ { role: "user", content: exampleQuery } ] }, {	streamMode: "values" } );
for await (const event of events) {
	console.log(event.messages[event.messages.length - 1]);
}
```

### Next Steps [Permalink for this section](https://docs.arcade.dev/home/langchain/auth-langchain-tools\#next-steps)

Now you’re ready to explore more LangChain tools with Arcade. Try integrating additional toolkits and crafting more complex queries to enhance your AI workflows.

[User authorization](https://docs.arcade.dev/home/langchain/user-auth-interrupts "User authorization") [Overview](https://docs.arcade.dev/home/oai-agents/overview "Overview")