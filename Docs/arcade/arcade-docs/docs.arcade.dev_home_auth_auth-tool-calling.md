---
url: "https://docs.arcade.dev/home/auth/auth-tool-calling"
title: "Arcade Docs"
---

[Home](https://docs.arcade.dev/home "Home") [Authorization](https://docs.arcade.dev/home/auth/how-arcade-helps "Authorization") Authorized Tool Calling

# Authorized Tool Calling

Arcade provides an authorization system that handles OAuth 2.0, API keys, and user tokens needed by AI agents to access external services through tools. This means your AI agents can now act on behalf of users securely and privately.

With Arcade, developers can now create agents that can as _as the end user of their application_ to perform tasks like:

- Creating a new Zoom meeting
- Sending or reading email
- Answering questions about files in Google Drive.

Arcade also allows for actions (tools) to be authorized directly. For example, to access a user’s Gmail account, you can utilize the following guide.

### Initialize the client [Permalink for this section](https://docs.arcade.dev/home/auth/auth-tool-calling\#initialize-the-client)

Import the Arcade client in a Python/Javascript script. The client automatically finds API keys set by `arcade login`.

PythonJavaScript

```nextra-code
from arcadepy import Arcade

client = Arcade() # Automatically finds the `ARCADE_API_KEY` env variable
```

```nextra-code
import Arcade from "@arcadeai/arcadejs";

const client = new Arcade(); // Automatically finds the `ARCADE_API_KEY` env variable
```

### Authorize a tool directly [Permalink for this section](https://docs.arcade.dev/home/auth/auth-tool-calling\#authorize-a-tool-directly)

Many tools require authorization. For example, the `Google.ListEmails` tool requires authorization with Google.

This authorization must be approved by the user. By approving, the user allows your agent or app to access only the data they’ve approved.

PythonJavaScript

```nextra-code
# As the developer, you must identify the user you're authorizing
# and pass a unique identifier for them (e.g. an email or user ID) to Arcade:
USER_ID = "you@example.com"

# Request access to the user's Gmail account
auth_response = client.tools.authorize(
  tool_name="Google.ListEmails",
  user_id=USER_ID,
)

if auth_response.status != "completed":
    print(f"Click this link to authorize: {auth_response.url}")
```

```nextra-code
// As the developer, you must identify the user you're authorizing
// and pass a unique identifier for them (e.g. an email or user ID) to Arcade:
const userId = "you@example.com";

// Request access to the user's Gmail account
const authResponse = await client.tools.authorize({
  tool_name: "Google.ListEmails",
  user_id: userId,
});

if (authResponse.status !== "completed") {
  console.log(`Click this link to authorize: ${authResponse.url}`);
}
```

This will print a URL that the user must visit to approve the authorization.

### Check for authorization status [Permalink for this section](https://docs.arcade.dev/home/auth/auth-tool-calling\#check-for-authorization-status)

You can wait for the authorization to complete using the following methods:

PythonJavaScript

```nextra-code
client.auth.wait_for_completion(auth_response)
```

```nextra-code
await client.auth.waitForCompletion(authResponse);
```

### Call the tool with authorization [Permalink for this section](https://docs.arcade.dev/home/auth/auth-tool-calling\#call-the-tool-with-authorization)

Once the user has approved the action, you can run the tool. You only need to pass the `user_id`:

PythonJavaScript

```nextra-code
emails_response = client.tools.execute(
    tool_name="Google.ListEmails",
    user_id=USER_ID,
)
print(emails_response)
```

```nextra-code
const emailsResponse = await client.tools.execute({
  tool_name: "Google.ListEmails",
  user_id: userId,
});

console.log(emailsResponse.output.value);
```

Arcade remembers the user’s authorization tokens, so you don’t have to! Next time the user runs the same tool, they won’t have to go through the authorization process again until the auth expires or is revoked.

### How it works [Permalink for this section](https://docs.arcade.dev/home/auth/auth-tool-calling\#how-it-works)

When you call a tool with `client.tools.execute()`, Arcade:

1. Checks for authorization.
2. Routes the request to the tool’s provider.
3. Returns the tool’s response.

With `client.tools.authorize()`, you can also authorize tools for later use.

These APIs give you programmatic control over tool calling.

### Next steps [Permalink for this section](https://docs.arcade.dev/home/auth/auth-tool-calling\#next-steps)

Arcade also allows you to [build your own tools](https://docs.arcade.dev/home/build-tools/create-a-toolkit) to integrate any custom functionality or API to your Agent or AI workflows.

Your tools can use the [service providers supported by Arcade](https://docs.arcade.dev/home/auth-providers) or you can integrate with any [OAuth2-compatible service](https://docs.arcade.dev/home/auth-providers/oauth2).

[How Arcade Helps](https://docs.arcade.dev/home/auth/how-arcade-helps "How Arcade Helps") [Direct Third-Party API Call](https://docs.arcade.dev/home/auth/call-third-party-apis-directly "Direct Third-Party API Call")