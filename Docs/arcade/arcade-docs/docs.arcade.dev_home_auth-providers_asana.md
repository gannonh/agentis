---
url: "https://docs.arcade.dev/home/auth-providers/asana"
title: "Arcade Docs"
---

[Home](https://docs.arcade.dev/home "Home") [Customizing Auth](https://docs.arcade.dev/home/auth-providers "Customizing Auth") Asana

# Asana auth provider

The Asana auth provider enables tools and agents to call Asana APIs on behalf of a user. Behind the scenes, the Arcade Engine and the Asana auth provider seamlessly manage Asana OAuth 2.0 authorization for your users.

Want to quickly get started with Asana services in your agent or AI app? The
pre-built [Arcade Asana toolkit](https://docs.arcade.dev/toolkits/productivity/asana) is what
you want!

## What’s documented here [Permalink for this section](https://docs.arcade.dev/home/auth-providers/asana\#whats-documented-here)

This page describes how to use and configure Asana auth with Arcade.

This auth provider is used by:

- The [Arcade Asana toolkit](https://docs.arcade.dev/toolkits/productivity/asana), which provides pre-built tools for interacting with Asana
- Your [app code](https://docs.arcade.dev/home/auth-providers/asana#using-asana-auth-in-app-code) that needs to call Asana APIs
- Or, your [custom tools](https://docs.arcade.dev/home/auth-providers/asana#using-asana-auth-in-custom-tools) that need to call Asana APIs

## Use Arcade’s Default Asana Auth Provider [Permalink for this section](https://docs.arcade.dev/home/auth-providers/asana\#use-arcades-default-asana-auth-provider)

Arcade offers a default Asana auth provider that you can use in the Arcade Cloud. In this case, your users will see `Arcade` as the name of the application that’s requesting permission.

If you choose to use Arcade’s Asana auth, you don’t need to configure anything. Follow the [Asana toolkit examples](https://docs.arcade.dev/toolkits/productivity/asana) to get started calling Asana tools.

## Use Your Own Asana App Credentials [Permalink for this section](https://docs.arcade.dev/home/auth-providers/asana\#use-your-own-asana-app-credentials)

In a production environment, you will most likely want to use your own Asana app credentials. This way, your users will see your application’s name requesting permission.

You can use your own Asana credentials in both the Arcade Cloud and in a [self-hosted Arcade Engine](https://docs.arcade.dev/home/install/local) instance.

Before showing how to configure your Asana app credentials, let’s go through the steps to create an Asana app.

## Create an Asana App [Permalink for this section](https://docs.arcade.dev/home/auth-providers/asana\#create-an-asana-app)

Follow the documentation on [Building an App with Asana](https://developers.asana.com/docs/overview). You may create a [developer sandbox account](https://developers.asana.com/docs/developer-sandbox) to test your app before moving to production.

When creating your app, use the following settings:

- Set an appropriate App name, description and icon. This will be visible to your users authorizing access to your app.
- Take note of the **Client ID** and **Client Secret**.
- In the OAuth settings:
  - Under “Redirect URLs”, click **Add Redirect URL** and add `https://cloud.arcade.dev/api/v1/oauth/callback`.
  - Under “Permission Scopes”, select “Full Permissions”
- In the “App Listing Details” section, optionally add more information about your app.
- In the “Manage Distribution” section, under “Choose a distribution method”, select “Any workspace”.
- Optionally, submit your app for the Asana team review.

Asana [recently introduced](https://forum.asana.com/t/new-oauth-permission-scopes/1048556) granular permission scopes. This feature is still in preview and the scopes available at the moment do not include all endpoints/actions that the Asana Toolkit needs. For those reasons, Arcade uses the “Full Permissions” scope.

## Configuring your own Asana Auth Provider in Arcade [Permalink for this section](https://docs.arcade.dev/home/auth-providers/asana\#configuring-your-own-asana-auth-provider-in-arcade)

There are two ways to configure your Asana app credentials in Arcade:

1. From the Arcade Dashboard GUI
2. By editing the `engine.yaml` file directly (only possible with a self-hosted Arcade Engine)

We show both options step-by-step below.

Dashboard GUIEngine Configuration YAML

### Configure Asana Auth Using the Arcade Dashboard GUI

#### Access the Arcade Dashboard [Permalink for this section](https://docs.arcade.dev/home/auth-providers/asana\#access-the-arcade-dashboard)

To access the Arcade Cloud dashboard, go to [api.arcade.dev/dashboard](https://api.arcade.dev/dashboard). If you are self-hosting, by default the dashboard will be available at `http://localhost:9099/dashboard`. Adjust the host and port number to match your environment.

#### Navigate to the OAuth Providers page [Permalink for this section](https://docs.arcade.dev/home/auth-providers/asana\#navigate-to-the-oauth-providers-page)

- Under the **OAuth** section of the Arcade Dashboard left-side menu, click **Providers**.
- Click **Add OAuth Provider** in the top right corner.
- Select the **Included Providers** tab at the top.
- In the **Provider** dropdown, select **Asana**.

#### Enter the provider details [Permalink for this section](https://docs.arcade.dev/home/auth-providers/asana\#enter-the-provider-details)

- Enter `asana` as the **ID** for your provider
- Optionally enter a **Description**.
- Enter the **Client ID** and **Client Secret** from your Asana app.

#### Create the provider [Permalink for this section](https://docs.arcade.dev/home/auth-providers/asana\#create-the-provider)

Hit the **Create** button and the provider will be ready to be used in the Arcade Engine.

### Configure Asana Auth Using the Engine Configuration YAML

Refer to [Engine configuration](https://docs.arcade.dev/home/configure/engine) for more information on how to set environment variables and configure the Arcade Engine.

#### Set environment variables [Permalink for this section](https://docs.arcade.dev/home/auth-providers/asana\#set-environment-variables)

Set the following environment variables:

```nextra-code
export ASANA_CLIENT_ID="<your client ID>"
export ASANA_CLIENT_SECRET="<your client secret>"
```

Or, you can set these values in a `.env` file:

```nextra-code
ASANA_CLIENT_ID="<your client ID>"
ASANA_CLIENT_SECRET="<your client secret>"
```

#### Edit the Engine configuration [Permalink for this section](https://docs.arcade.dev/home/auth-providers/asana\#edit-the-engine-configuration)

To locate the `engine.yaml` file in your OS after installing the Arcade Engine, check the [Engine configuration file](https://docs.arcade.dev/home/configure/overview#engine-configuration-file) documentation.

Edit the `engine.yaml` file and add an Asana item to the `auth.providers` section:

```nextra-code
auth:
  providers:
    - id: asana
      description: "Custom Asana provider"
      enabled: true
      type: oauth2
      client_id: ${env:ASANA_CLIENT_ID}
      client_secret: ${env:ASANA_CLIENT_SECRET}

```

#### Restart the Arcade Engine [Permalink for this section](https://docs.arcade.dev/home/auth-providers/asana\#restart-the-arcade-engine)

If the Arcade Engine is already running, you will need to restart it for the changes to take effect.

## Using the Arcade Asana Toolkit [Permalink for this section](https://docs.arcade.dev/home/auth-providers/asana\#using-the-arcade-asana-toolkit)

The [Arcade Asana toolkit](https://docs.arcade.dev/toolkits/productivity/asana) provides tools to interact with various Asana objects, such as tasks, projects, teams, and users.

Refer to the [toolkit documentation and examples](https://docs.arcade.dev/toolkits/productivity/asana) to learn how to use the toolkit to build agents and AI apps that interact with Asana services.

## Using Asana auth in app code [Permalink for this section](https://docs.arcade.dev/home/auth-providers/asana\#using-asana-auth-in-app-code)

Use the Asana auth provider in your own agents and AI apps to get a user-scoped token for the Asana API. See [authorizing agents with Arcade](https://docs.arcade.dev/home/auth/how-arcade-helps) to understand how this works.

Use `client.auth.start()` to get a user token for the Asana API:

As explained [above](https://docs.arcade.dev/home/auth-providers/asana#create-an-asana-app), the Asana granular permission scopes are in preview and not yet supported. The `"default"` scope should be used to authorize any action/endpoint you need to call in the Asana API.

PythonJavaScript

If you are [self-hosting Arcade](https://docs.arcade.dev/home/install/overview), change the `base_url` parameter in the `Arcade` constructor to match your Arcade Engine URL. By default, the Engine will be available at `http://localhost:9099`.

```nextra-code
from arcadepy import Arcade

client = Arcade(base_url="https://api.arcade.dev")  # Automatically finds the `ARCADE_API_KEY` env variable

user_id = "user@example.com"

# Start the authorization process
auth_response = client.auth.start(
    user_id=user_id,
    provider="asana",
    scopes=["default"],
)

if auth_response.status != "completed":
    print("Please complete the authorization challenge in your browser:")
    print(auth_response.url)

# Wait for the authorization to complete
auth_response = client.auth.wait_for_completion(auth_response)

# Do something interesting with the token...
auth_token = auth_response.context.token
```

If you are [self-hosting Arcade](https://docs.arcade.dev/home/install/overview), change the `baseURL` parameter in the `Arcade` constructor to match your Arcade Engine URL. By default, the Engine will be available at `http://localhost:9099`.

```nextra-code
import { Arcade } from "@arcadeai/arcadejs";

const client = new Arcade({ baseURL: "https://api.arcade.dev" }); // Automatically finds the `ARCADE_API_KEY` env variable

const userId = "user@example.com";

// Start the authorization process
const authResponse = await client.auth.start(userId, "asana", {
  scopes: ["default"],
});

if (authResponse.status !== "completed") {
  console.log("Please complete the authorization challenge in your browser:");
  console.log(authResponse.url);
}

// Wait for the authorization to complete
const response = await client.auth.waitForCompletion(authResponse);

// Do something interesting with the token...
const auth_token = response.context.token;
```

You can use the auth token to call the [Get multiple tasks endpoint](https://developers.asana.com/reference/gettasks) and read information about tasks, for example. Any Asana API endpoint can be called with the auth token.

## Using Asana auth in custom tools [Permalink for this section](https://docs.arcade.dev/home/auth-providers/asana\#using-asana-auth-in-custom-tools)

The Arcade [Model API](https://docs.arcade.dev/home/use-tools/call-tools-with-models) is a convenient way to call language models and automatically invoke tools. You can author your own [custom tools](https://docs.arcade.dev/home/build-tools/create-a-toolkit) that interact with the Asana API.

Use the `Asana()` auth class to specify that a tool requires authorization with Asana. The authentication token needed to call the Asana API is available in the tool context through the `context.get_auth_token_or_empty()` method.

As explained [above](https://docs.arcade.dev/home/auth-providers/asana#create-an-asana-app), the Asana granular permission scopes are in preview and not yet supported. The `"default"` scope should be used as the only scope in all tools.

```nextra-code
from typing import Annotated

import httpx

from arcade.sdk import ToolContext, tool
from arcade.sdk.auth import Asana


@tool(requires_auth=Asana(scopes=["default"]))
async def delete_task(
    context: ToolContext,
    task_id: Annotated[str, "The ID of the task to delete."],
) -> Annotated[dict, "Details of the deletion response"]:
    """Deletes a task."""
    url = f"https://api.asana.com/api/1.0/tasks/{task_id}"
    headers = {
        "Authorization": f"Bearer {context.get_auth_token_or_empty()}",
        "Accept": "application/json",
    }

    async with httpx.AsyncClient() as client:
        response = await client.delete(url, headers=headers)
        response.raise_for_status()
        return response.json()
```

If you are [self-hosting Arcade](https://docs.arcade.dev/home/install/overview), you will need to restart the Arcade Worker and the Engine for the new tool to be available.

Your new tool can be called like demonstrated below:

PythonJavaScript

If you are self-hosting, change the `base_url` parameter in the `Arcade` constructor to match your Arcade Engine URL. By default, the Engine will be available at `http://localhost:9099`.

```nextra-code
from arcadepy import Arcade

client = Arcade(base_url="https://api.arcade.dev")  # Automatically finds the `ARCADE_API_KEY` env variable

USER_ID = "user@example.com"
TOOL_NAME = "Asana.DeleteTask"

auth_response = client.tools.authorize(tool_name=TOOL_NAME, user_id=USER_ID)

if auth_response.status != "completed":
    print(f"Click this link to authorize: {auth_response.url}")

# Wait for the authorization to complete
client.auth.wait_for_completion(auth_response)

tool_input = {
    "task_id": "1234567890",
}

response = client.tools.execute(
    tool_name=TOOL_NAME,
    input=tool_input,
    user_id=USER_ID,
)
print(response.output.value)
```

If you are self-hosting, change the `baseURL` parameter in the `Arcade` constructor to match your Arcade Engine URL. By default, the Engine will be available at `http://localhost:9099`.

```nextra-code
import { Arcade } from "@arcadeai/arcadejs";

const client = new Arcade({ baseURL: "https://api.arcade.dev" }); // Automatically finds the `ARCADE_API_KEY` env variable

const USER_ID = "user@example.com";
const TOOL_NAME = "Asana.DeleteTask";

// Start the authorization process
const authResponse = await client.tools.authorize({
  tool_name: TOOL_NAME,
  user_id: USER_ID,
});

if (authResponse.status !== "completed") {
  console.log(`Click this link to authorize: ${authResponse.url}`);
}

// Wait for the authorization to complete
await client.auth.waitForCompletion(authResponse);

const toolInput = {
  task_id: "1234567890",
};

const response = await client.tools.execute({
  tool_name: TOOL_NAME,
  input: toolInput,
  user_id: USER_ID,
});

console.log(response.output.value);
```

[Overview](https://docs.arcade.dev/home/auth-providers "Overview") [Atlassian](https://docs.arcade.dev/home/auth-providers/atlassian "Atlassian")