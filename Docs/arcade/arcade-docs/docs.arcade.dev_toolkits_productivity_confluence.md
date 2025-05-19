---
url: "https://docs.arcade.dev/toolkits/productivity/confluence"
title: "Arcade Docs"
---

[Integrations](https://docs.arcade.dev/toolkits "Integrations") [Productivity & Docs](https://docs.arcade.dev/toolkits/productivity/google "Productivity & Docs") Confluence

# Confluence

The Atlassian auth provider enables tools and agents to call the Atlassian API on behalf of a user. Behind the scenes, the Arcade Engine and the Atlassian auth provider seamlessly manage Atlassian OAuth 2.0 authorization for your users.

### What’s documented here [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/confluence\#whats-documented-here)

This page describes how to use and configure Atlassian auth with Arcade.

This auth provider is used by:

- Your [app code](https://docs.arcade.dev/toolkits/productivity/confluence#using-atlassian-auth-in-app-code) that needs to call Atlassian APIs
- Or, your [custom tools](https://docs.arcade.dev/toolkits/productivity/confluence#using-atlassian-auth-in-custom-tools) that need to call Atlassian APIs

## Configuring Atlassian auth [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/confluence\#configuring-atlassian-auth)

### Create an Atlassian app [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/confluence\#create-an-atlassian-app)

- Create a Atlassian app in the [Atlassian developer console](https://developer.atlassian.com/console/myapps/)
- In the Authorization tab, click the “Add” action button and set the Callback URL to: `https://cloud.arcade.dev/api/v1/oauth/callback`
- In the Permissions tab, enable any permissions you need for your app
- In the Settings tab, copy the Client ID and Secret to use below

Next, add the Atlassian app to your Arcade Engine configuration. You can do this in the Arcade Dashboard, or by editing the `engine.yaml` file directly (for a self-hosted instance).

### Configuring Atlassian auth with the Arcade Dashboard [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/confluence\#configuring-atlassian-auth-with-the-arcade-dashboard)

1. Navigate to the OAuth section of the Arcade Dashboard and click **Add OAuth Provider**.
2. Select **Atlassian** as the provider.
3. Choose a unique **ID** for your provider (e.g. “my-atlassian-provider”) with an optional **Description**.
4. Enter your **Client ID** and **Client Secret** from your Atlassian app.
5. Click **Save**.

When you use tools that require Atlassian auth using your Arcade account credentials, the Arcade Engine will automatically use this Atlassian OAuth provider.

### Configuring Atlassian auth in self-hosted Arcade Engine configuration [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/confluence\#configuring-atlassian-auth-in-self-hosted-arcade-engine-configuration)

### Set environment variables [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/confluence\#set-environment-variables)

Set the following environment variables:

```nextra-code
export ATLASSIAN_CLIENT_ID="<your client ID>"
export ATLASSIAN_CLIENT_SECRET="<your client secret>"
```

Or, you can set these values in a `.env` file:

```nextra-code
ATLASSIAN_CLIENT_SECRET="<your client secret>"
ATLASSIAN_CLIENT_ID="<your client ID>"
```

See [Engine configuration](https://docs.arcade.dev/home/configure/engine) for more information on how
to set environment variables and configure the Arcade Engine.

### Edit the Engine configuration [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/confluence\#edit-the-engine-configuration)

Edit the `engine.yaml` file and add a `atlassian` item to the `auth.providers` section:

```nextra-code
auth:
  providers:
    - id: default-atlassian
      description: "The default Atlassian provider"
      enabled: true
      type: oauth2
      provider_id: atlassian
      client_id: ${env:ATLASSIAN_CLIENT_ID}
      client_secret: ${env:ATLASSIAN_CLIENT_SECRET}
```

## Using Atlassian auth in app code [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/confluence\#using-atlassian-auth-in-app-code)

Use the Atlassian auth provider in your own agents and AI apps to get a user token for the Atlassian API. See [authorizing agents with Arcade](https://docs.arcade.dev/home/auth/how-arcade-helps) to understand how this works.

Use `client.auth.start()` to get a user token for the Atlassian API:

PythonJavaScript

```nextra-code
from arcadepy import Arcade

client = Arcade()  # Automatically finds the `ARCADE_API_KEY` env variable

user_id = "user@example.com"

# Start the authorization process
auth_response = client.auth.start(
    user_id=user_id,
    provider="atlassian",
    scopes=["read:me", "read:jira-user", "read:confluence-user"],
)

if auth_response.status != "completed":
    print("Please complete the authorization challenge in your browser:")
    print(auth_response.url)

# Wait for the authorization to complete
auth_response = client.auth.wait_for_completion(auth_response)

token = auth_response.context.token
# Do something interesting with the token...
```

```nextra-code
import { Arcade } from "@arcadeai/arcadejs";

const client = new Arcade(); // Automatically finds the `ARCADE_API_KEY` env variable

const userId = "user@example.com";

// Start the authorization process
let authResponse = await client.auth.start(userId, "atlassian", {
  scopes: ["read:me", "read:jira-user", "read:confluence-user"],
});

if (authResponse.status !== "completed") {
  console.log("Please complete the authorization challenge in your browser:");
  console.log(authResponse.url);
}

// Wait for the authorization to complete
authResponse = await client.auth.waitForCompletion(authResponse);

const token = authResponse.context.token;
// Do something interesting with the token...
```

## Using Atlassian auth in custom tools [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/confluence\#using-atlassian-auth-in-custom-tools)

You can author your own [custom tools](https://docs.arcade.dev/home/build-tools/create-a-toolkit) that interact with the Atlassian API.

Use the `Atlassian()` auth class to specify that a tool requires authorization with Atlassian. The `context.authorization.token` field will be automatically populated with the user’s Atlassian token:

```nextra-code
from typing import Annotated, Optional

import httpx

from arcade.sdk import ToolContext, tool
from arcade.sdk.auth import Atlassian


@tool(
    requires_auth=Atlassian(
        scopes=["read:jira-work"],
    )
)
async def list_projects(
    context: ToolContext,
    query: Annotated[\
        Optional[str],\
        "The query to filter the projects by. Defaults to empty string to list all projects.",\
    ] = "",
) -> Annotated[dict, "The list of projects in a user's Jira instance"]:
    """List a Jira user's projects."""
    url = f"https://api.atlassian.com/ex/jira/<cloudId>/rest/api/3/project/search?query={query}"
    headers = {"Authorization": f"Bearer {context.authorization.token}"}

    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers)
        response.raise_for_status()
        return response.json()
```

[Obsidian](https://docs.arcade.dev/toolkits/productivity/obsidian "Obsidian") [Jira](https://docs.arcade.dev/toolkits/productivity/jira "Jira")