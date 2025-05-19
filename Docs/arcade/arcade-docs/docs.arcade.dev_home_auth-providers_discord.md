---
url: "https://docs.arcade.dev/home/auth-providers/discord"
title: "Arcade Docs"
---

[Home](https://docs.arcade.dev/home "Home") [Customizing Auth](https://docs.arcade.dev/home/auth-providers "Customizing Auth") Discord

# Discord auth provider

At this time, Arcade does not offer a default Discord Auth Provider. To use
Discord auth, you must create a custom Auth Provider with your own Discord
OAuth 2.0 credentials as described below.

The Discord auth provider enables tools and agents to call the Discord API on behalf of a user. Behind the scenes, the Arcade Engine and the Discord auth provider seamlessly manage Discord OAuth 2.0 authorization for your users.

### What’s documented here [Permalink for this section](https://docs.arcade.dev/home/auth-providers/discord\#whats-documented-here)

This page describes how to use and configure Discord auth with Arcade.

This auth provider is used by:

- Your [app code](https://docs.arcade.dev/home/auth-providers/discord#using-discord-auth-in-app-code) that needs to call Discord APIs
- Or, your [custom tools](https://docs.arcade.dev/home/auth-providers/discord#using-discord-auth-in-custom-tools) that need to call Discord APIs

## Configuring Discord auth [Permalink for this section](https://docs.arcade.dev/home/auth-providers/discord\#configuring-discord-auth)

### Create a Discord app [Permalink for this section](https://docs.arcade.dev/home/auth-providers/discord\#create-a-discord-app)

- Create a Discord Application in the [Discord developer portal](https://discord.com/developers/applications)
- In the OAuth2 tab, set the redirect URI to: `https://cloud.arcade.dev/api/v1/oauth/callback`
- Copy the Client ID and Client Secret (you may need to reset the secret to see it)

Next, add the Discord app to your Arcade Engine configuration. You can do this in the Arcade Dashboard, or by editing the `engine.yaml` file directly (for a self-hosted instance).

### Configuring Discord auth with the Arcade Dashboard [Permalink for this section](https://docs.arcade.dev/home/auth-providers/discord\#configuring-discord-auth-with-the-arcade-dashboard)

1. Navigate to the OAuth section of the Arcade Dashboard and click **Add OAuth Provider**.
2. Select **Discord** as the provider.
3. Choose a unique **ID** for your provider (e.g. “my-discord-provider”) with an optional **Description**.
4. Enter your **Client ID** and **Client Secret** from your Discord app.
5. Click **Save**.

When you use tools that require Discord auth using your Arcade account credentials, the Arcade Engine will automatically use this Discord OAuth provider.

### Configuring Discord auth in self-hosted Arcade Engine configuration [Permalink for this section](https://docs.arcade.dev/home/auth-providers/discord\#configuring-discord-auth-in-self-hosted-arcade-engine-configuration)

### Set environment variables [Permalink for this section](https://docs.arcade.dev/home/auth-providers/discord\#set-environment-variables)

Set the following environment variables:

```nextra-code
export DISCORD_CLIENT_ID="<your client ID>"
export DISCORD_CLIENT_SECRET="<your client secret>"
```

Or, you can set these values in a `.env` file:

```nextra-code
DISCORD_CLIENT_SECRET="<your client secret>"
DISCORD_CLIENT_ID="<your client ID>"
```

See [Engine configuration](https://docs.arcade.dev/home/configure/engine) for more information on how
to set environment variables and configure the Arcade Engine.

### Edit the Engine configuration [Permalink for this section](https://docs.arcade.dev/home/auth-providers/discord\#edit-the-engine-configuration)

Edit the `engine.yaml` file and add a `discord` item to the `auth.providers` section:

```nextra-code
auth:
  providers:
    - id: default-discord
      description: "The default Discord provider"
      enabled: true
      type: oauth2
      provider_id: discord
      client_id: ${env:DISCORD_CLIENT_ID}
      client_secret: ${env:DISCORD_CLIENT_SECRET}
```

## Using Discord auth in app code [Permalink for this section](https://docs.arcade.dev/home/auth-providers/discord\#using-discord-auth-in-app-code)

Use the Discord auth provider in your own agents and AI apps to get a user token for the Discord API. See [authorizing agents with Arcade](https://docs.arcade.dev/home/auth/how-arcade-helps) to understand how this works.

Use `client.auth.start()` to get a user token for the Discord API:

PythonJavaScript

```nextra-code
from arcadepy import Arcade

client = Arcade()  # Automatically finds the `ARCADE_API_KEY` env variable

user_id = "user@example.com"

# Start the authorization process
auth_response = client.auth.start(
    user_id=user_id,
    provider="discord",
    scopes=["identify", "email", "guilds", "guilds.join"],
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

const client = new Arcade();

const userId = "user@example.com";

// Start the authorization process
const authResponse = await client.auth.start(userId, "discord", {
  scopes: ["identify", "email", "guilds", "guilds.join"],
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

## Using Discord auth in custom tools [Permalink for this section](https://docs.arcade.dev/home/auth-providers/discord\#using-discord-auth-in-custom-tools)

You can author your own [custom tools](https://docs.arcade.dev/home/build-tools/create-a-toolkit) that interact with the Discord API.

Use the `Discord()` auth class to specify that a tool requires authorization with Discord. The `context.authorization.token` field will be automatically populated with the user’s Discord token:

```nextra-code
from typing import Annotated, Optional

import httpx

from arcade.sdk import ToolContext, tool
from arcade.sdk.auth import Discord


@tool(
    requires_auth=Discord(
        scopes=["guilds"],
    )
)
async def list_servers(
    context: ToolContext,
    user_id: Annotated[\
        Optional[str],\
        "The user's user ID. Defaults to '@me' for the current user.",\
    ] = "@me",
) -> Annotated[dict, "List of servers the user is a member of"]:
    """List a Discord user's servers they are a member of."""
    url = f"https://discord.com/api/users/{user_id}/guilds"
    headers = {"Authorization": f"Bearer {context.authorization.token}"}

    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers)
        response.raise_for_status()
        return response.json()
```

[Atlassian](https://docs.arcade.dev/home/auth-providers/atlassian "Atlassian") [Dropbox](https://docs.arcade.dev/home/auth-providers/dropbox "Dropbox")