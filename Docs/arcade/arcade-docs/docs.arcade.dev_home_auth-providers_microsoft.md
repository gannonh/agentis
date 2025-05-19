---
url: "https://docs.arcade.dev/home/auth-providers/microsoft"
title: "Arcade Docs"
---

[Home](https://docs.arcade.dev/home "Home") [Customizing Auth](https://docs.arcade.dev/home/auth-providers "Customizing Auth") Microsoft

# Microsoft auth provider

At this time, Arcade does not offer a default Microsoft Auth Provider. To use
Microsoft auth, you must create a custom Auth Provider with your own Microsoft
OAuth 2.0 credentials as described below.

The Microsoft auth provider enables tools and agents to call the Microsoft Graph API on behalf of a user. Behind the scenes, the Arcade Engine and the Microsoft auth provider seamlessly manage Microsoft OAuth 2.0 authorization for your users.

### What’s documented here [Permalink for this section](https://docs.arcade.dev/home/auth-providers/microsoft\#whats-documented-here)

This page describes how to use and configure Microsoft auth with Arcade.

This auth provider is used by:

- Your [app code](https://docs.arcade.dev/home/auth-providers/microsoft#using-microsoft-auth-in-app-code) that needs to call Microsoft Graph APIs
- Or, your [custom tools](https://docs.arcade.dev/home/auth-providers/microsoft#using-microsoft-auth-in-custom-tools) that need to call Microsoft Graph APIs

## Configuring Microsoft auth [Permalink for this section](https://docs.arcade.dev/home/auth-providers/microsoft\#configuring-microsoft-auth)

How you configure the Microsoft auth provider depends on whether you use the Arcade Cloud Engine or a [self-hosted Engine](https://docs.arcade.dev/home/install/overview).

When you are ready to go to production, you’ll want to configure the Microsoft auth provider with your own Microsoft app credentials, so users see your app name when they authorize access.

### Create a Microsoft app [Permalink for this section](https://docs.arcade.dev/home/auth-providers/microsoft\#create-a-microsoft-app)

- Follow Microsoft’s guide to [registering an app with the Microsoft identity platform](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app)
- Choose the permissions (scopes) you need for your app
- Set the redirect URL to: `https://cloud.arcade.dev/api/v1/oauth/callback`
- Copy the client ID and client secret to use below

Next, add the Microsoft app to your Arcade Engine configuration. You can do this in the Arcade Dashboard, or by editing the `engine.yaml` file directly (for a self-hosted instance).

### Configuring Microsoft auth with the Arcade Dashboard [Permalink for this section](https://docs.arcade.dev/home/auth-providers/microsoft\#configuring-microsoft-auth-with-the-arcade-dashboard)

1. Navigate to the OAuth section of the Arcade Dashboard and click **Add OAuth Provider**.
2. Select **Microsoft** as the provider.
3. Choose a unique **ID** for your provider (e.g. “my-microsoft-provider”) with an optional **Description**.
4. Enter your **Client ID** and **Client Secret** from your Microsoft app.
5. Click **Save**.

When you use tools that require Microsoft auth using your Arcade account credentials, the Arcade Engine will automatically use this Microsoft OAuth provider.

### Configuring Microsoft auth in self-hosted Arcade Engine configuration [Permalink for this section](https://docs.arcade.dev/home/auth-providers/microsoft\#configuring-microsoft-auth-in-self-hosted-arcade-engine-configuration)

### Set environment variables [Permalink for this section](https://docs.arcade.dev/home/auth-providers/microsoft\#set-environment-variables)

Set the following environment variables:

```nextra-code
export MICROSOFT_CLIENT_ID="<your client ID>"
export MICROSOFT_CLIENT_SECRET="<your client secret>"
```

Or, you can set these values in a `.env` file:

```nextra-code
MICROSOFT_CLIENT_ID="<your client ID>"
MICROSOFT_CLIENT_SECRET="<your client secret>"
```

See [Engine configuration](https://docs.arcade.dev/home/configure/engine) for more information on how
to set environment variables and configure the Arcade Engine.

### Edit the Engine configuration [Permalink for this section](https://docs.arcade.dev/home/auth-providers/microsoft\#edit-the-engine-configuration)

Edit the `engine.yaml` file and add a `microsoft` item to the `auth.providers` section:

```nextra-code
auth:
  providers:
    - id: default-microsoft
      description: "The default Microsoft provider"
      enabled: true
      type: oauth2
      provider_id: microsoft
      client_id: ${env:MICROSOFT_CLIENT_ID}
      client_secret: ${env:MICROSOFT_CLIENT_SECRET}
```

## Using Microsoft auth in app code [Permalink for this section](https://docs.arcade.dev/home/auth-providers/microsoft\#using-microsoft-auth-in-app-code)

Use the Microsoft auth provider in your own agents and AI apps to get a user token for Microsoft Graph APIs. See [authorizing agents with Arcade](https://docs.arcade.dev/home/auth/how-arcade-helps) to understand how this works.

Use `client.auth.start()` to get a user token for Microsoft Graph APIs:

PythonJavaScript

```nextra-code
from arcadepy import Arcade

client = Arcade()  # Automatically finds the `ARCADE_API_KEY` env variable

user_id = "user@example.com"

# Start the authorization process
auth_response = client.auth.start(
    user_id=user_id,
    provider="microsoft",
    scopes=["User.Read", "Files.Read"],
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
let authResponse = await client.auth.start(userId, "microsoft", {
  scopes: ["User.Read", "Files.Read"],
});

if (authResponse.status !== "completed") {
  console.log("Please complete the authorization challenge in your browser:");
  console.log(authResponse.url);
}

// Wait for the authorization to complete
authResponse = await client.auth.waitForCompletion(authResponse);

const token = authResponse.context.token;
// TODO: Do something interesting with the token...
```

## Using Microsoft auth in custom tools [Permalink for this section](https://docs.arcade.dev/home/auth-providers/microsoft\#using-microsoft-auth-in-custom-tools)

You can author your own [custom tools](https://docs.arcade.dev/home/build-tools/create-a-toolkit) that interact with Microsoft Graph APIs.

Use the `Microsoft()` auth class to specify that a tool requires authorization with Microsoft. The `context.authorization.token` field will be automatically populated with the user’s Microsoft token:

```nextra-code
from typing import Annotated

import httpx

from arcade.sdk import ToolContext, tool
from arcade.sdk.auth import Microsoft


@tool(
    requires_auth=Microsoft(
        scopes=["User.Read", "Files.Read"],
    )
)
async def get_file_contents(
    context: ToolContext,
    file_id: Annotated[str, "The ID of the file to get the contents of"],
) -> Annotated[str, "The contents of the file"]:
    """Get the contents of a file from Microsoft Graph."""
    url = f"https://graph.microsoft.com/v1.0/me/drive/items/{file_id}"
    headers = {"Authorization": f"Bearer {context.authorization.token}"}

    async with httpx.AsyncClient() as client:
        response = await client.get(
            url=url,
            headers=headers,
        )
        response.raise_for_status()
        return response.json()
```

[Linkedin](https://docs.arcade.dev/home/auth-providers/linkedin "Linkedin") [Notion](https://docs.arcade.dev/home/auth-providers/notion "Notion")