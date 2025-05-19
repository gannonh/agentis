---
url: "https://docs.arcade.dev/home/auth-providers/spotify"
title: "Arcade Docs"
---

[Home](https://docs.arcade.dev/home "Home") [Customizing Auth](https://docs.arcade.dev/home/auth-providers "Customizing Auth") Spotify

# Spotify auth provider

At this time, Arcade does not offer a default Spotify Auth Provider. To use
Spotify auth, you must create a custom Auth Provider with your own Spotify
OAuth 2.0 credentials as described below.

The Spotify auth provider enables tools and agents to call the Spotify API on behalf of a user. Behind the scenes, the Arcade Engine and the Spotify auth provider seamlessly manage Spotify OAuth 2.0 authorization for your users.

### What’s documented here [Permalink for this section](https://docs.arcade.dev/home/auth-providers/spotify\#whats-documented-here)

This page describes how to use and configure Spotify auth with Arcade.

This auth provider is used by:

- Your [app code](https://docs.arcade.dev/home/auth-providers/spotify#using-spotify-auth-in-app-code) that needs to call Spotify APIs
- Or, your [custom tools](https://docs.arcade.dev/home/auth-providers/spotify#using-spotify-auth-in-custom-tools) that need to call Spotify APIs

## Configuring Spotify auth [Permalink for this section](https://docs.arcade.dev/home/auth-providers/spotify\#configuring-spotify-auth)

How you configure the Spotify auth provider depends on whether you use the Arcade Cloud Engine or a [self-hosted Engine](https://docs.arcade.dev/home/install/overview).

When you are ready to go to production, you’ll want to configure the Spotify auth provider with your own Spotify app credentials, so users see your app name when they authorize access.

### Create a Spotify app [Permalink for this section](https://docs.arcade.dev/home/auth-providers/spotify\#create-a-spotify-app)

- Follow Spotify’s guide to [registering an app](https://developer.spotify.com/documentation/web-api/tutorials/getting-started)
- Choose the “Web API” product (at a minimum)
- Set the redirect URL to: `https://cloud.arcade.dev/api/v1/oauth/callback`
- Copy the client ID and client secret to use below

Next, add the Spotify app to your Arcade Engine configuration. You can do this in the Arcade Dashboard, or by editing the `engine.yaml` file directly (for a self-hosted instance).

### Configuring Spotify auth with the Arcade Dashboard [Permalink for this section](https://docs.arcade.dev/home/auth-providers/spotify\#configuring-spotify-auth-with-the-arcade-dashboard)

1. Navigate to the OAuth section of the Arcade Dashboard and click **Add OAuth Provider**.
2. Select **Spotify** as the provider.
3. Choose a unique **ID** for your provider (e.g. “my-spotify-provider”) with an optional **Description**.
4. Enter your **Client ID** and **Client Secret** from your Spotify app.
5. Click **Save**.

When you use tools that require Spotify auth using your Arcade account credentials, the Arcade Engine will automatically use this Spotify OAuth provider.

### Configuring Spotify auth in self-hosted Arcade Engine configuration [Permalink for this section](https://docs.arcade.dev/home/auth-providers/spotify\#configuring-spotify-auth-in-self-hosted-arcade-engine-configuration)

### Set environment variables [Permalink for this section](https://docs.arcade.dev/home/auth-providers/spotify\#set-environment-variables)

Set the following environment variables:

```nextra-code
export SPOTIFY_CLIENT_ID="<your client ID>"
export SPOTIFY_CLIENT_SECRET="<your client secret>"
```

Or, you can set these values in a `.env` file:

```nextra-code
SPOTIFY_CLIENT_ID="<your client ID>"
SPOTIFY_CLIENT_SECRET="<your client secret>"
```

See [Engine configuration](https://docs.arcade.dev/home/configure/engine) for more information on how
to set environment variables and configure the Arcade Engine.

### Edit the Engine configuration [Permalink for this section](https://docs.arcade.dev/home/auth-providers/spotify\#edit-the-engine-configuration)

Edit the `engine.yaml` file and add a `spotify` item to the `auth.providers` section:

```nextra-code
auth:
  providers:
    - id: default-spotify
      description: "The default Spotify provider"
      enabled: true
      type: oauth2
      provider_id: spotify
      client_id: ${env:SPOTIFY_CLIENT_ID}
      client_secret: ${env:SPOTIFY_CLIENT_SECRET}
```

## Using Spotify auth in app code [Permalink for this section](https://docs.arcade.dev/home/auth-providers/spotify\#using-spotify-auth-in-app-code)

Use the Spotify auth provider in your own agents and AI apps to get a user token for the Spotify API. See [authorizing agents with Arcade](https://docs.arcade.dev/home/auth/how-arcade-helps) to understand how this works.

Use `client.auth.start()` to get a user token for the Spotify API:

PythonJavaScript

```nextra-code
from arcadepy import Arcade

client = Arcade()  # Automatically finds the `ARCADE_API_KEY` env variable

user_id = "user@example.com"

# Start the authorization process
auth_response = client.auth.start(
    user_id=user_id,
    provider="spotify",
    scopes=["user-read-playback-state"],
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
let authResponse = await client.auth.start(userId, "spotify", [\
  "user-read-playback-state",\
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

## Using Spotify auth in custom tools [Permalink for this section](https://docs.arcade.dev/home/auth-providers/spotify\#using-spotify-auth-in-custom-tools)

You can author your own [custom tools](https://docs.arcade.dev/home/build-tools/create-a-toolkit) that interact with the Spotify API.

Use the `Spotify()` auth class to specify that a tool requires authorization with Spotify. The `context.authorization.token` field will be automatically populated with the user’s Spotify token:

```nextra-code
from typing import Annotated

import httpx

from arcade.sdk import ToolContext, tool
from arcade.sdk.auth import Spotify


@tool(
    requires_auth=Spotify(
        scopes=["user-read-playback-state"],
    )
)
async def get_playback_state(
    context: ToolContext,
) -> Annotated[dict, "Information about the user's current playback state"]:
    """Get information about the user's current playback state, including track or episode, progress, and active device."""
    endpoint = "/me/player"
    headers = {"Authorization": f"Bearer {context.authorization.token}"}

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"https://api.spotify.com/v1/{endpoint}",
            headers=headers,
        )
        response.raise_for_status()

        if response.status_code == 204:
            return {"status": "Playback not available or active"}
        return response.json()
```

[Slack](https://docs.arcade.dev/home/auth-providers/slack "Slack") [Twitch](https://docs.arcade.dev/home/auth-providers/twitch "Twitch")