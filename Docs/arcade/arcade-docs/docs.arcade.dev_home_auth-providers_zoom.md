---
url: "https://docs.arcade.dev/home/auth-providers/zoom"
title: "Arcade Docs"
---

[Home](https://docs.arcade.dev/home "Home") [Customizing Auth](https://docs.arcade.dev/home/auth-providers "Customizing Auth") Zoom

# Zoom auth provider

At this time, Arcade does not offer a default Zoom Auth Provider. To use Zoom
auth, you must create a custom Auth Provider with your own Zoom OAuth 2.0
credentials as described below.

The Zoom auth provider enables tools and agents to call the Zoom API on behalf of a user. Behind the scenes, the Arcade Engine and the Zoom auth provider seamlessly manage Zoom OAuth 2.0 authorization for your users.

### What’s documented here [Permalink for this section](https://docs.arcade.dev/home/auth-providers/zoom\#whats-documented-here)

This page describes how to use and configure Zoom auth with Arcade.

This auth provider is used by:

- Your [app code](https://docs.arcade.dev/home/auth-providers/zoom#using-zoom-auth-in-app-code) that needs to call Zoom APIs
- Or, your [custom tools](https://docs.arcade.dev/home/auth-providers/zoom#using-zoom-auth-in-custom-tools) that need to call Zoom APIs

## Configuring Zoom auth [Permalink for this section](https://docs.arcade.dev/home/auth-providers/zoom\#configuring-zoom-auth)

How you configure the Zoom auth provider depends on whether you use the Arcade Cloud Engine or a [self-hosted Engine](https://docs.arcade.dev/home/install/overview).

When you are ready to go to production, you’ll want to configure the Zoom auth provider with your own Zoom app credentials, so users see your app name when they authorize access.

### Create a Zoom app [Permalink for this section](https://docs.arcade.dev/home/auth-providers/zoom\#create-a-zoom-app)

- Follow Zoom’s guide to [registering an app](https://developers.zoom.us/docs/integrations/create/) on the Zoom marketplace
- Set the redirect URL to: `https://cloud.arcade.dev/api/v1/oauth/callback` and enable Strict Mode
- Enable the Zoom features and permissions (scopes) that your app needs
- Copy the client ID and client secret to use below

Next, add the Zoom app to your Arcade Engine configuration. You can do this in the Arcade Dashboard, or by editing the `engine.yaml` file directly (for a self-hosted instance).

### Configuring Zoom auth with the Arcade Dashboard [Permalink for this section](https://docs.arcade.dev/home/auth-providers/zoom\#configuring-zoom-auth-with-the-arcade-dashboard)

1. Navigate to the OAuth section of the Arcade Dashboard and click **Add OAuth Provider**.
2. Select **Zoom** as the provider.
3. Choose a unique **ID** for your provider (e.g. “my-zoom-provider”) with an optional **Description**.
4. Enter your **Client ID** and **Client Secret** from your Zoom app.
5. Click **Save**.

When you use tools that require Zoom auth using your Arcade account credentials, the Arcade Engine will automatically use this Zoom OAuth provider.

### Configuring Zoom auth in self-hosted Arcade Engine configuration [Permalink for this section](https://docs.arcade.dev/home/auth-providers/zoom\#configuring-zoom-auth-in-self-hosted-arcade-engine-configuration)

### Set environment variables [Permalink for this section](https://docs.arcade.dev/home/auth-providers/zoom\#set-environment-variables)

Set the following environment variables:

```nextra-code
export ZOOM_CLIENT_ID="<your client ID>"
export ZOOM_CLIENT_SECRET="<your client secret>"
```

Or, you can set these values in a `.env` file:

```nextra-code
ZOOM_CLIENT_ID="<your client ID>"
ZOOM_CLIENT_SECRET="<your client secret>"
```

See [Engine configuration](https://docs.arcade.dev/home/configure/engine) for more information on how
to set environment variables and configure the Arcade Engine.

### Edit the Engine configuration [Permalink for this section](https://docs.arcade.dev/home/auth-providers/zoom\#edit-the-engine-configuration)

Edit the `engine.yaml` file and add a `zoom` item to the `auth.providers` section:

```nextra-code
auth:
  providers:
    - id: default-zoom
      description: "The default Zoom provider"
      enabled: true
      type: oauth2
      provider_id: zoom
      client_id: ${env:ZOOM_CLIENT_ID}
      client_secret: ${env:ZOOM_CLIENT_SECRET}
```

## Using Zoom auth in app code [Permalink for this section](https://docs.arcade.dev/home/auth-providers/zoom\#using-zoom-auth-in-app-code)

Use the Zoom auth provider in your own agents and AI apps to get a user token for the Zoom API. See [authorizing agents with Arcade](https://docs.arcade.dev/home/auth/how-arcade-helps) to understand how this works.

Use `client.auth.start()` to get a user token for the Zoom API:

PythonJavaScript

```nextra-code
from arcadepy import Arcade

client = Arcade()  # Automatically finds the `ARCADE_API_KEY` env variable

user_id = "user@example.com"

# Start the authorization process
auth_response = client.auth.start(
    user_id=user_id,
    provider="zoom",
    scopes=["meeting:read:list_upcoming_meetings"],
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
let authResponse = await client.auth.start(userId, "zoom", [\
  "meeting:read:list_upcoming_meetings",\
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

## Using Zoom auth in custom tools [Permalink for this section](https://docs.arcade.dev/home/auth-providers/zoom\#using-zoom-auth-in-custom-tools)

You can author your own [custom tools](https://docs.arcade.dev/home/build-tools/create-a-toolkit) that interact with the Zoom API.

Use the `Zoom()` auth class to specify that a tool requires authorization with Zoom. The `context.authorization.token` field will be automatically populated with the user’s Zoom token:

```nextra-code
from typing import Annotated, Optional

import httpx

from arcade.sdk import ToolContext, tool
from arcade.sdk.auth import Zoom


@tool(
    requires_auth=Zoom(
        scopes=["meeting:read:list_upcoming_meetings"],
    )
)
async def list_upcoming_meetings(
    context: ToolContext,
    user_id: Annotated[\
        Optional[str],\
        "The user's user ID or email address. Defaults to 'me' for the current user.",\
    ] = "me",
) -> Annotated[dict, "List of upcoming meetings within the next 24 hours"]:
    """List a Zoom user's upcoming meetings within the next 24 hours."""
    url = f"https://api.zoom.us/v2/users/{user_id}/upcoming_meetings"
    headers = {"Authorization": f"Bearer {context.authorization.token}"}

    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers)
        response.raise_for_status()
        return response.json()
```

[X](https://docs.arcade.dev/home/auth-providers/x "X") [FAQ](https://docs.arcade.dev/home/faq "FAQ")