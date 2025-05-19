---
url: "https://docs.arcade.dev/home/auth-providers/notion"
title: "Arcade Docs"
---

[Home](https://docs.arcade.dev/home "Home") [Customizing Auth](https://docs.arcade.dev/home/auth-providers "Customizing Auth") Notion

# Notion auth provider

The Notion auth provider enables tools and agents to call [Notion APIs](https://developers.notion.com/reference/intro) on behalf of a user. Behind the scenes, the Arcade Engine and the Notion auth provider seamlessly manage Notion OAuth 2.0 authorization for your users.

### What’s documented here [Permalink for this section](https://docs.arcade.dev/home/auth-providers/notion\#whats-documented-here)

This page describes how to use and configure Notion auth with Arcade.

This auth provider is used by:

- Your [app code](https://docs.arcade.dev/home/auth-providers/notion#using-notion-auth-in-app-code) that needs to call the Notion API
- Or, your [custom tools](https://docs.arcade.dev/home/auth-providers/notion#using-notion-auth-in-custom-tools) that need to call the Notion API

## Configuring Notion auth [Permalink for this section](https://docs.arcade.dev/home/auth-providers/notion\#configuring-notion-auth)

How you configure the Notion auth provider depends on whether you use the Arcade Cloud Engine or a [self-hosted Engine](https://docs.arcade.dev/home/install/overview).

With the Arcade Cloud Engine, you can start building and testing Notion auth without any configuration. Your users will see `Arcade (demo)` as the name of the application that’s requesting permission.

When you are ready to go to production, you’ll want to configure the Notion auth provider with your own Notion app credentials, so users see your app name when they authorize access.

### Create a Notion app [Permalink for this section](https://docs.arcade.dev/home/auth-providers/notion\#create-a-notion-app)

- Create a new public integration in your [integration’s settings page](https://www.notion.so/profile/integrations)
- Set the redirect URI to: `https://cloud.arcade.dev/api/v1/oauth/callback`
- Once you complete creating your integration, copy the client ID and client secret to use below

Next, add the Notion app to your Arcade Engine configuration. You can do this in the Arcade Dashboard, or by editing the `engine.yaml` file directly (for a self-hosted instance).

### Configuring Notion auth with the Arcade Dashboard [Permalink for this section](https://docs.arcade.dev/home/auth-providers/notion\#configuring-notion-auth-with-the-arcade-dashboard)

1. Navigate to the OAuth section of the Arcade Dashboard and click **Add OAuth Provider**.
2. Select **Notion** as the provider.
3. Choose a unique **ID** for your provider (e.g. “my-notion-provider”) with an optional **Description**.
4. Enter your **Client ID** and **Client Secret** from your Notion app.
5. Click **Save**.

When you use tools that require Notion auth using your Arcade account credentials, the Arcade Engine will automatically use this Notion OAuth provider.

### Configuring Notion auth in self-hosted Arcade Engine configuration [Permalink for this section](https://docs.arcade.dev/home/auth-providers/notion\#configuring-notion-auth-in-self-hosted-arcade-engine-configuration)

### Set environment variables [Permalink for this section](https://docs.arcade.dev/home/auth-providers/notion\#set-environment-variables)

Set the following environment variables:

```nextra-code
export NOTION_CLIENT_ID="<your client ID>"
export NOTION_CLIENT_SECRET="<your client secret>"
```

Or, you can set these values in a `.env` file:

```nextra-code
NOTION_CLIENT_ID="<your client ID>"
NOTION_CLIENT_SECRET="<your client secret>"
```

See [Engine configuration](https://docs.arcade.dev/home/configure/engine) for more information on how
to set environment variables and configure the Arcade Engine.

### Edit the Engine configuration [Permalink for this section](https://docs.arcade.dev/home/auth-providers/notion\#edit-the-engine-configuration)

Edit the `engine.yaml` file and add a `notion` item to the `auth.providers` section:

```nextra-code
auth:
  providers:
    - id: default-notion
      description: "The default Notion provider"
      enabled: true
      type: oauth2
      provider_id: notion
      client_id: ${env:NOTION_CLIENT_ID}
      client_secret: ${env:NOTION_CLIENT_SECRET}
```

## Using Notion auth in app code [Permalink for this section](https://docs.arcade.dev/home/auth-providers/notion\#using-notion-auth-in-app-code)

Use the Notion auth provider in your own agents and AI apps to get a user token for the Notion API. See [authorizing agents with Arcade](https://docs.arcade.dev/home/auth/how-arcade-helps) to understand how this works.

Use `client.auth.start()` to get a user token for the Notion API:

PythonJavaScript

```nextra-code
from arcadepy import Arcade

client = Arcade()  # Automatically finds the `ARCADE_API_KEY` env variable

user_id = "user@example.com"

# Start the authorization process
auth_response = client.auth.start(
    user_id=user_id,
    provider="notion"
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
const authResponse = await client.auth.start(userId, "notion");

if (authResponse.status !== "completed") {
  console.log("Please complete the authorization challenge in your browser:");
  console.log(authResponse.url);
}

// Wait for the authorization to complete
authResponse = await client.auth.waitForCompletion(authResponse);

const token = authResponse.context.token;
// Do something interesting with the token...
```

## Using Notion auth in custom tools [Permalink for this section](https://docs.arcade.dev/home/auth-providers/notion\#using-notion-auth-in-custom-tools)

You can use the pre-built [Arcade Notion toolkit](https://docs.arcade.dev/toolkits/development/github/github) to quickly build agents and AI apps that interact with Notion.

If the pre-built tools in the Notion toolkit don’t meet your needs, you can author your own [custom tools](https://docs.arcade.dev/home/build-tools/create-a-toolkit) that interact with the Notion API.

Use the `Notion()` auth class to specify that a tool requires authorization with Notion. The `context.authorization.token` field will be automatically populated with the user’s Notion token:

```nextra-code
from typing import Annotated

import httpx
from arcade.sdk import ToolContext, tool
from arcade.sdk.auth import Notion


@tool(requires_auth=Notion())
async def search_page_by_title(
    context: ToolContext,
    title_includes: Annotated[str, "The text to compare against page and database titles."],
) -> Annotated[dict, "The matching pages."]:
    """
    Search for a Notion page by its title.
    """
    url = "https://api.notion.com/v1/search"
    headers = {
        "Authorization": context.authorization.token,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
    }
    payload = {"query": title_includes, "filter": {"property": "object", "value": "page"}}

    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers, json=payload)
        response.raise_for_status()
        return dict(response.json())
```

[Microsoft](https://docs.arcade.dev/home/auth-providers/microsoft "Microsoft") [OAuth 2.0](https://docs.arcade.dev/home/auth-providers/oauth2 "OAuth 2.0")