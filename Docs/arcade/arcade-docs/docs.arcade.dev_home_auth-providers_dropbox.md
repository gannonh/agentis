---
url: "https://docs.arcade.dev/home/auth-providers/dropbox"
title: "Arcade Docs"
---

[Home](https://docs.arcade.dev/home "Home") [Customizing Auth](https://docs.arcade.dev/home/auth-providers "Customizing Auth") Dropbox

# Dropbox auth provider

At this time, Arcade does not offer a default Dropbox Auth Provider. To use
Dropbox auth, you must create a custom Auth Provider with your own Dropbox
OAuth 2.0 credentials as described below.

The Dropbox auth provider enables tools and agents to call the Dropbox API on behalf of a user. Behind the scenes, the Arcade Engine and the Dropbox auth provider seamlessly manage Dropbox OAuth 2.0 authorization for your users.

### What’s documented here [Permalink for this section](https://docs.arcade.dev/home/auth-providers/dropbox\#whats-documented-here)

This page describes how to use and configure Dropbox auth with Arcade.

This auth provider is used by:

- Your [app code](https://docs.arcade.dev/home/auth-providers/dropbox#using-dropbox-auth-in-app-code) that needs to call Dropbox APIs
- Or, your [custom tools](https://docs.arcade.dev/home/auth-providers/dropbox#using-dropbox-auth-in-custom-tools) that need to call Dropbox APIs

## Configuring Dropbox auth [Permalink for this section](https://docs.arcade.dev/home/auth-providers/dropbox\#configuring-dropbox-auth)

### Create a Dropbox app [Permalink for this section](https://docs.arcade.dev/home/auth-providers/dropbox\#create-a-dropbox-app)

- Create a Dropbox Application in the [Dropbox App Console](https://www.dropbox.com/developers/apps)
- In the Settings tab, under the “OAuth 2” section, set the redirect URI to: `https://cloud.arcade.dev/api/v1/oauth/callback`
- In the Permissions tab, add any scopes that your app will need
- In the Settings tab, copy the App key (Client ID) and App secret (Client Secret), which you’ll need below

Next, add the Dropbox app to your Arcade Engine configuration. You can do this in the Arcade Dashboard, or by editing the `engine.yaml` file directly (for a self-hosted instance).

### Configuring Dropbox auth with the Arcade Dashboard [Permalink for this section](https://docs.arcade.dev/home/auth-providers/dropbox\#configuring-dropbox-auth-with-the-arcade-dashboard)

1. Navigate to the OAuth section of the Arcade Dashboard and click **Add OAuth Provider**.
2. Select **Dropbox** as the provider.
3. Choose a unique **ID** for your provider (e.g. “my-dropbox-provider”) with an optional **Description**.
4. Enter your **Client ID** and **Client Secret** from your Dropbox app.
5. Click **Save**.

When you use tools that require Dropbox auth using your Arcade account credentials, the Arcade Engine will automatically use this Dropbox OAuth provider.

### Configuring Dropbox auth in self-hosted Arcade Engine configuration [Permalink for this section](https://docs.arcade.dev/home/auth-providers/dropbox\#configuring-dropbox-auth-in-self-hosted-arcade-engine-configuration)

### Set environment variables [Permalink for this section](https://docs.arcade.dev/home/auth-providers/dropbox\#set-environment-variables)

The Client ID is the Dropbox “App key” and the Client Secret is the Dropbox
“App secret”.

Set the following environment variables:

```nextra-code
export DROPBOX_CLIENT_ID="<your client ID>"
export DROPBOX_CLIENT_SECRET="<your client secret>"
```

Or, you can set these values in a `.env` file:

```nextra-code
DROPBOX_CLIENT_SECRET="<your client secret>"
DROPBOX_CLIENT_ID="<your client ID>"
```

See [Engine configuration](https://docs.arcade.dev/home/configure/engine) for more information on how
to set environment variables and configure the Arcade Engine.

### Edit the Engine configuration [Permalink for this section](https://docs.arcade.dev/home/auth-providers/dropbox\#edit-the-engine-configuration)

Edit the `engine.yaml` file and add a `dropbox` item to the `auth.providers` section:

```nextra-code
auth:
  providers:
    - id: default-dropbox
      description: "The default Dropbox provider"
      enabled: true
      type: oauth2
      provider_id: dropbox
      client_id: ${env:DROPBOX_CLIENT_ID}
      client_secret: ${env:DROPBOX_CLIENT_SECRET}

```

## Using Dropbox auth in app code [Permalink for this section](https://docs.arcade.dev/home/auth-providers/dropbox\#using-dropbox-auth-in-app-code)

Use the Dropbox auth provider in your own agents and AI apps to get a user-scoped token for the Dropbox API. See [authorizing agents with Arcade](https://docs.arcade.dev/home/auth/how-arcade-helps) to understand how this works.

Use `client.auth.start()` to get a user token for the Dropbox API:

PythonJavaScript

```nextra-code
from arcadepy import Arcade

client = Arcade()  # Automatically finds the `ARCADE_API_KEY` env variable

user_id = "user@example.com"

# Start the authorization process
auth_response = client.auth.start(
    user_id=user_id,
    provider="dropbox",
    scopes=["openid", "sharing.read", "files.metadata.read"],
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
const authResponse = await client.auth.start(userId, "dropbox", {
  scopes: ["openid", "sharing.read", "files.metadata.read"],
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

## Using Dropbox auth in custom tools [Permalink for this section](https://docs.arcade.dev/home/auth-providers/dropbox\#using-dropbox-auth-in-custom-tools)

You can author your own [custom tools](https://docs.arcade.dev/home/build-tools/create-a-toolkit) that interact with the Dropbox API.

Use the `Dropbox()` auth class to specify that a tool requires authorization with Dropbox. The `context.authorization.token` field will be automatically populated with the user’s Dropbox token:

```nextra-code
from typing import Annotated, Optional

import httpx

from arcade.sdk import ToolContext, tool
from arcade.sdk.auth import Dropbox


@tool(
    requires_auth=Dropbox(
        scopes=["files.metadata.read"],
    )
)
async def list_files(
    context: ToolContext,
    path: Annotated[\
        Optional[str],\
        "The path to the folder to list the contents of. Defaults to empty string to list the root folder.",\
    ] = "",
) -> Annotated[dict, "List of servers the user is a member of"]:
    """Starts returning the contents of a folder."""
    url = "https://api.dropboxapi.com/2/files/list_folder"
    headers = {"Authorization": f"Bearer {context.authorization.token}"}

    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers, json={"path": path})
        response.raise_for_status()
        return response.json()
```

[Discord](https://docs.arcade.dev/home/auth-providers/discord "Discord") [GitHub](https://docs.arcade.dev/home/auth-providers/github "GitHub")