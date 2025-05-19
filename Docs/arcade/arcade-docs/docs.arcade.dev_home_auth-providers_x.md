---
url: "https://docs.arcade.dev/home/auth-providers/x"
title: "Arcade Docs"
---

[Home](https://docs.arcade.dev/home "Home") [Customizing Auth](https://docs.arcade.dev/home/auth-providers "Customizing Auth") X

# X auth provider

The X auth provider enables tools and agents to call the X (Twitter) API on behalf of a user. Behind the scenes, the Arcade Engine and the X auth provider seamlessly manage X OAuth 2.0 authorization for your users.

Want to quickly get started with X services in your agent or AI app? The
pre-built [Arcade X toolkit](https://docs.arcade.dev/toolkits/social-communication/x) is what you
want!

### What’s documented here [Permalink for this section](https://docs.arcade.dev/home/auth-providers/x\#whats-documented-here)

This page describes how to use and configure X auth with Arcade.

This auth provider is used by:

- The [Arcade X toolkit](https://docs.arcade.dev/toolkits/social-communication/x), which provides pre-built tools for interacting with X
- Your [app code](https://docs.arcade.dev/home/auth-providers/x#using-x-auth-in-app-code) that needs to call X APIs
- Or, your [custom tools](https://docs.arcade.dev/home/auth-providers/x#using-x-auth-in-custom-tools) that need to call X APIs

## Configuring X auth [Permalink for this section](https://docs.arcade.dev/home/auth-providers/x\#configuring-x-auth)

How you configure the X auth provider depends on whether you use the Arcade Cloud Engine or a [self-hosted Engine](https://docs.arcade.dev/home/install/overview).

With the Arcade Cloud Engine, you can start building and testing X auth without any configuration. Your users will see `Arcade (demo)` as the name of the application that’s requesting permission.

When you are ready to go to production, you’ll want to configure the X auth provider with your own X app credentials, so users see your app name when they authorize access.

### Create an X app [Permalink for this section](https://docs.arcade.dev/home/auth-providers/x\#create-an-x-app)

- Follow X’s guide to [creating an app](https://developer.x.com/en/docs/x-api/getting-started/getting-access-to-the-x-api)
- Enable user authentication for your new app, and set its type to “Web App, Automated App or Bot”
- Set the redirect URL to: `https://cloud.arcade.dev/api/v1/oauth/callback`
- Copy the client ID and client secret to use below

Next, add the X app to your Arcade Engine configuration. You can do this in the Arcade Dashboard, or by editing the `engine.yaml` file directly (for a self-hosted instance).

### Configuring X auth with the Arcade Dashboard [Permalink for this section](https://docs.arcade.dev/home/auth-providers/x\#configuring-x-auth-with-the-arcade-dashboard)

1. Navigate to the OAuth section of the Arcade Dashboard and click **Add OAuth Provider**.
2. Select **X** as the provider.
3. Choose a unique **ID** for your provider (e.g. “my-x-provider”) with an optional **Description**.
4. Enter your **Client ID** and **Client Secret** from your X app.
5. Click **Save**.

When you use tools that require X auth using your Arcade account credentials, the Arcade Engine will automatically use this X OAuth provider.

### Configuring X auth in self-hosted Arcade Engine configuration [Permalink for this section](https://docs.arcade.dev/home/auth-providers/x\#configuring-x-auth-in-self-hosted-arcade-engine-configuration)

### Set environment variables [Permalink for this section](https://docs.arcade.dev/home/auth-providers/x\#set-environment-variables)

Set the following environment variables:

```nextra-code
export X_CLIENT_ID="<your client ID>"
export X_CLIENT_SECRET="<your client secret>"
```

Or, you can set these values in a `.env` file:

```nextra-code
X_CLIENT_ID="<your client ID>"
X_CLIENT_SECRET="<your client secret>"
```

See [Engine configuration](https://docs.arcade.dev/home/configure/engine) for more information on how
to set environment variables and configure the Arcade Engine.

### Edit the Engine configuration [Permalink for this section](https://docs.arcade.dev/home/auth-providers/x\#edit-the-engine-configuration)

Edit the `engine.yaml` file and add an `x` item to the `auth.providers` section:

```nextra-code
auth:
  providers:
    - id: default-x
      description: "The default X provider"
      enabled: true
      type: oauth2
      provider_id: x
      client_id: ${env:X_CLIENT_ID}
      client_secret: ${env:X_CLIENT_SECRET}
```

## Using X auth in app code [Permalink for this section](https://docs.arcade.dev/home/auth-providers/x\#using-x-auth-in-app-code)

Use the X auth provider in your own agents and AI apps to get a user token for the X API. See [authorizing agents with Arcade](https://docs.arcade.dev/home/auth/how-arcade-helps) to understand how this works.

Use `client.auth.start()` to get a user token for X:

PythonJavaScript

```nextra-code
from arcadepy import Arcade

client = Arcade()  # Automatically finds the `ARCADE_API_KEY` env variable

user_id = "user@example.com"

# Start the authorization process
auth_response = client.auth.start(
    user_id=user_id,
    provider="x",
    scopes=["tweet.read", "tweet.write", "users.read"],
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
let authResponse = await client.auth.start(userId, "x", [\
  "tweet.read",\
  "tweet.write",\
  "users.read",\
]);

if (authResponse.status !== "completed") {
  console.log("Please complete the authorization challenge in your browser:");
  console.log(authResponse.url);
}

// Wait for the authorization to complete
authResponse = await client.auth.waitForCompletion(authResponse);

const token = authResponse.context.token;
// Do something interesting with the token...
```

## Using X auth in custom tools [Permalink for this section](https://docs.arcade.dev/home/auth-providers/x\#using-x-auth-in-custom-tools)

You can use the pre-built [Arcade X toolkit](https://docs.arcade.dev/toolkits/social-communication/x) to quickly build agents and AI apps that interact with X.

If the pre-built tools in the X toolkit don’t meet your needs, you can author your own [custom tools](https://docs.arcade.dev/home/build-tools/create-a-toolkit) that interact with the X API.

Use the `X()` auth class to specify that a tool requires authorization with X. The `context.authorization.token` field will be automatically populated with the user’s X token:

```nextra-code
from typing import Annotated

import httpx

from arcade.sdk import ToolContext, tool
from arcade.sdk.auth import X


@tool(
    requires_auth=X(
        scopes=["tweet.read", "tweet.write", "users.read"],
    )
)
async def post_tweet(
    context: ToolContext,
    tweet_text: Annotated[str, "The text content of the tweet you want to post"],
) -> Annotated[str, "Success string and the URL of the tweet"]:
    """Post a tweet to X (Twitter)."""
    url = "https://api.x.com/2/tweets"
    headers = {
        "Authorization": f"Bearer {context.authorization.token}",
        "Content-Type": "application/json",
    }
    payload = {"text": tweet_text}

    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers, json=payload)
        response.raise_for_status()

        tweet_id = response.json()["data"]["id"]
        return f"Tweet with id {tweet_id} posted successfully. URL: https://x.com/x/status/{tweet_id}"
```

[Twitch](https://docs.arcade.dev/home/auth-providers/twitch "Twitch") [Zoom](https://docs.arcade.dev/home/auth-providers/zoom "Zoom")