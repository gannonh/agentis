---
url: "https://docs.arcade.dev/home/auth/how-arcade-helps"
title: "Arcade Docs"
---

[Home](https://docs.arcade.dev/home "Home") AuthorizationHow Arcade Helps

# How Arcade helps with Agent Authorization

### The challenges that Arcade solves [Permalink for this section](https://docs.arcade.dev/home/auth/how-arcade-helps\#the-challenges-that-arcade-solves)

Applications that use models to perform tasks ( _agentic applications_) commonly require access to sensitive data and services. Authentication complexities often hinder AI from performing tasks that require user-specific information, like what emails you recently received or what’s coming up on your calendar.

To retrieve this information, agentic applications need to be able to authenticate and authorize access to external services you use like Gmail or Google Calendar.

Authenticating to retrieve information, however, is not the only challenge. Agentic applications also need to authenticate in order to **act** on your behalf - like sending an email or updating your calendar.

Without auth, AI agents are severely limited in what they can do.

### How Arcade solves this [Permalink for this section](https://docs.arcade.dev/home/auth/how-arcade-helps\#how-arcade-solves-this)

Arcade provides an authorization system that handles OAuth 2.0, API keys, and user tokens needed by AI agents to access external services through tools. This means your AI agents can now act on behalf of users securely and privately.

With Arcade, developers can now create agents that can _act as the end users of their application_ to perform tasks like:

- Creating a new Zoom meeting
- Sending or reading email
- Answering questions about files in Google Drive.

### Auth permissions and scopes [Permalink for this section](https://docs.arcade.dev/home/auth/how-arcade-helps\#auth-permissions-and-scopes)

Each tool in Arcade’s toolkits has a set of required permissions - or, more commonly referred to in OAuth2, **scopes**. For example, the [`Google.SendEmail`](https://docs.arcade.dev/toolkits/productivity/google/gmail#sendemail) tool requires the [`https://www.googleapis.com/auth/gmail.send`](https://developers.google.com/identity/protocols/oauth2/scopes#gmail) scope.

A scope is what the user has authorized someone else (in this case, the AI agent) to do on their behalf. In any OAuth2-compatible service, each kind of action requires a different set of permissions. This gives the user fine-grained control over what data third-party services can access and what actions can be executed in their accounts.

When a tool is called, the Arcade Engine will check if the user has granted the required permissions. If not, it will automatically prompt the user to authorize the tool, coordinating the OAuth2 flow with the service provider.

### How to implement OAuth2-authorized tool calling [Permalink for this section](https://docs.arcade.dev/home/auth/how-arcade-helps\#how-to-implement-oauth2-authorized-tool-calling)

To learn how Arcade allows for actions (tools) to be authorized through OAuth2 and how to implement it, check out [Authorized Tool Calling](https://docs.arcade.dev/home/auth/auth-tool-calling).

### Tools that don’t require authorization [Permalink for this section](https://docs.arcade.dev/home/auth/how-arcade-helps\#tools-that-dont-require-authorization)

Some tools, like [`Search.SearchGoogle`](https://docs.arcade.dev/toolkits/search/google_search#searchgoogle), allow AI agents to retrieve information or perform actions without needing user-specific authorization.

PythonJavaScript

```nextra-code
from arcadepy import Arcade

client = Arcade(api_key="arcade_api_key")  # or set the ARCADE_API_KEY env var

# Use the Search.SearchGoogle tool to perform a web search
response = await client.tools.execute(
    tool_name="Search.SearchGoogle",
    input={"query": "Latest AI advancements"},
)
print(response.output.value)
```

```nextra-code
import { Arcade } from "@arcadeai/arcadejs";

const client = new Arcade(api_key="arcade_api_key");  // or set the ARCADE_API_KEY env var

// Use the Search.SearchGoogle tool to perform a web search
const response = await client.tools.execute({
  tool_name: "Search.SearchGoogle",
  input: { query: "Latest AI advancements" },
});
console.log(response.output.value);
```

[Tool formats](https://docs.arcade.dev/home/use-tools/get-tool-definitions "Tool formats") [Authorized Tool Calling](https://docs.arcade.dev/home/auth/auth-tool-calling "Authorized Tool Calling")