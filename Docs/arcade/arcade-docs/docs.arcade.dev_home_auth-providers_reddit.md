---
url: "https://docs.arcade.dev/home/auth-providers/reddit"
title: "Arcade Docs"
---

[Home](https://docs.arcade.dev/home "Home") [Customizing Auth](https://docs.arcade.dev/home/auth-providers "Customizing Auth") Reddit

# Reddit auth provider

At this time, Arcade does not offer a default Reddit Auth Provider. To use
Reddit auth, you must create a custom Auth Provider with your own Reddit
OAuth 2.0 credentials as described below.

The Reddit auth provider enables tools and agents to call the Reddit API on behalf of a user. Behind the scenes, the Arcade Engine and the Reddit auth provider seamlessly manage Reddit OAuth 2.0 authorization for your users.

### What’s documented here [Permalink for this section](https://docs.arcade.dev/home/auth-providers/reddit\#whats-documented-here)

This page describes how to use and configure Reddit auth with Arcade.

This auth provider is used by:

- Your [app code](https://docs.arcade.dev/home/auth-providers/reddit#using-reddit-auth-in-app-code) that needs to call Reddit APIs
- Or, your [custom tools](https://docs.arcade.dev/home/auth-providers/reddit#using-reddit-auth-in-custom-tools) that need to call Reddit APIs

## Configuring Reddit auth [Permalink for this section](https://docs.arcade.dev/home/auth-providers/reddit\#configuring-reddit-auth)

### Create a Reddit app [Permalink for this section](https://docs.arcade.dev/home/auth-providers/reddit\#create-a-reddit-app)

- Create a Reddit Application in the [Reddit App Console](https://www.reddit.com/prefs/apps)
- Set the OAuth Redirect URL to: `https://cloud.arcade.dev/api/v1/oauth/callback`
- Copy the App key (Client ID) and App secret (Client Secret), which you’ll need below

Next, add the Reddit app to your Arcade Engine configuration. You can do this in the Arcade Dashboard, or by editing the `engine.yaml` file directly (for a self-hosted instance).

### Configuring Reddit auth with the Arcade Dashboard [Permalink for this section](https://docs.arcade.dev/home/auth-providers/reddit\#configuring-reddit-auth-with-the-arcade-dashboard)

1. Navigate to the OAuth section of the Arcade Dashboard and click **Add OAuth Provider**.
2. Select **Reddit** as the provider.
3. Choose a unique **ID** for your provider (e.g. “my-reddit-provider”) with an optional **Description**.
4. Enter your **Client ID** and **Client Secret** from your Reddit app.
5. Click **Save**.

When you use tools that require Reddit auth using your Arcade account credentials, the Arcade Engine will automatically use this Reddit OAuth provider.

### Configuring Reddit auth in self-hosted Arcade Engine configuration [Permalink for this section](https://docs.arcade.dev/home/auth-providers/reddit\#configuring-reddit-auth-in-self-hosted-arcade-engine-configuration)

### Set environment variables [Permalink for this section](https://docs.arcade.dev/home/auth-providers/reddit\#set-environment-variables)

The Client ID is the Reddit “App key” and the Client Secret is the Reddit
“App secret”.

Set the following environment variables:

```nextra-code
export REDDIT_CLIENT_ID="<your client ID>"
export REDDIT_CLIENT_SECRET="<your client secret>"
```

Or, you can set these values in a `.env` file:

```nextra-code
REDDIT_CLIENT_SECRET="<your client secret>"
REDDIT_CLIENT_ID="<your client ID>"
```

See [Engine configuration](https://docs.arcade.dev/home/configure/engine) for more information on how
to set environment variables and configure the Arcade Engine.

### Edit the Engine configuration [Permalink for this section](https://docs.arcade.dev/home/auth-providers/reddit\#edit-the-engine-configuration)

Edit the `engine.yaml` file and add a `reddit` item to the `auth.providers` section:

```nextra-code
auth:
  providers:
    - id: default-reddit
      description: "The default Reddit provider"
      enabled: true
      type: oauth2
      provider_id: reddit
      client_id: ${env:REDDIT_CLIENT_ID}
      client_secret: ${env:REDDIT_CLIENT_SECRET}
```

## Using Reddit auth in app code [Permalink for this section](https://docs.arcade.dev/home/auth-providers/reddit\#using-reddit-auth-in-app-code)

Use the Reddit auth provider in your own agents and AI apps to get a user-scoped token for the Reddit API. See [authorizing agents with Arcade](https://docs.arcade.dev/home/auth/how-arcade-helps) to understand how this works.

Use `client.auth.start()` to get a user token for the Reddit API:

PythonJavaScript

```nextra-code
from arcadepy import Arcade

client = Arcade()  # Automatically finds the `ARCADE_API_KEY` env variable

user_id = "user@example.com"

# Start the authorization process
auth_response = client.auth.start(
    user_id=user_id,
    provider="reddit",
    scopes=["identity"],
)

if auth_response.status != "completed":
    print("Please complete the authorization challenge in your browser:")
    print(auth_response.url)

# Wait for the authorization to complete
auth_response = client.auth.wait_for_completion(auth_response)

token = auth_response.context.token
# TODO: Do something interesting with the token...
```

```nextra-code
import { Arcade } from "@arcadeai/arcadejs";

const client = new Arcade();

const userId = "user@example.com";

// Start the authorization process
const authResponse = await client.auth.start(userId, "reddit", {
  scopes: ["identity"],
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

## Using Reddit auth in custom tools [Permalink for this section](https://docs.arcade.dev/home/auth-providers/reddit\#using-reddit-auth-in-custom-tools)

You can author your own [custom tools](https://docs.arcade.dev/home/build-tools/create-a-toolkit) that interact with the Reddit API.

Use the `Reddit()` auth class to specify that a tool requires authorization with Reddit. The `context.authorization.token` field will be automatically populated with the user’s Reddit token:

```nextra-code
from typing import Annotated

import httpx

from arcade.sdk import ToolContext, tool
from arcade.sdk.auth import Reddit


@tool(
    requires_auth=Reddit(
        scopes=["identity"],
    )
)
async def get_user_info(
    context: ToolContext,
) -> Annotated[dict, "The user info"]:
    """Get the user info for the current user."""
    url = "https://oauth.reddit.com/api/v1/me"
    headers = {
        "Authorization": f"Bearer {context.authorization.token}",
        "User-Agent": "YourAppName v1.0 by u/YourRedditUsername",
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers)
        response.raise_for_status()
        return response.json()
```

[OAuth 2.0](https://docs.arcade.dev/home/auth-providers/oauth2 "OAuth 2.0") [Slack](https://docs.arcade.dev/home/auth-providers/slack "Slack")