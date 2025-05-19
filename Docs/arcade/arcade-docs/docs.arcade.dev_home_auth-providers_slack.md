---
url: "https://docs.arcade.dev/home/auth-providers/slack"
title: "Arcade Docs"
---

[Home](https://docs.arcade.dev/home "Home") [Customizing Auth](https://docs.arcade.dev/home/auth-providers "Customizing Auth") Slack

# Slack auth provider

The Slack auth provider enables tools and agents to call [Slack APIs](https://api.slack.com/docs) on behalf of a user. Behind the scenes, the Arcade Engine and the Slack auth provider seamlessly manage Slack OAuth 2.0 authorization for your users.

Want to quickly get started with Slack in your agent or AI app? The pre-built
[Arcade Slack toolkit](https://docs.arcade.dev/toolkits/social-communication/slack) is what you want!

### What’s documented here [Permalink for this section](https://docs.arcade.dev/home/auth-providers/slack\#whats-documented-here)

This page describes how to use and configure Slack auth with Arcade.

This auth provider is used by:

- The [Arcade Slack toolkit](https://docs.arcade.dev/toolkits/social-communication/slack), which provides pre-built tools for interacting with Slack
- Your [app code](https://docs.arcade.dev/home/auth-providers/slack#using-slack-auth-in-app-code) that needs to call the Slack API
- Or, your [custom tools](https://docs.arcade.dev/home/auth-providers/slack#using-slack-auth-in-custom-tools) that need to call the Slack API

## Configuring Slack auth [Permalink for this section](https://docs.arcade.dev/home/auth-providers/slack\#configuring-slack-auth)

How you configure the Slack auth provider depends on whether you use the Arcade Cloud Engine or a [self-hosted Engine](https://docs.arcade.dev/home/install/overview).

With the Arcade Cloud Engine, you can start building and testing Slack auth without any configuration. Your users will see `Arcade (demo)` as the name of the application that’s requesting permission.

When you are ready to go to production, you’ll want to configure the Slack auth provider with your own Slack app credentials, so users see your app name when they authorize access.

### Create a Slack app [Permalink for this section](https://docs.arcade.dev/home/auth-providers/slack\#create-a-slack-app)

- Follow Slack’s guide to [registering a Slack app](https://api.slack.com/quickstart)
- Choose the scopes (permissions) you need for your app
- Set the redirect URL to: `https://cloud.arcade.dev/api/v1/oauth/callback`
- Copy the client ID and client secret

Next, add the Slack app to your Arcade Engine configuration. You can do this in the Arcade Dashboard, or by editing the `engine.yaml` file directly (for a self-hosted instance).

### Configuring Slack auth with the Arcade Dashboard [Permalink for this section](https://docs.arcade.dev/home/auth-providers/slack\#configuring-slack-auth-with-the-arcade-dashboard)

1. Navigate to the OAuth section of the Arcade Dashboard and click **Add OAuth Provider**.
2. Select **Slack** as the provider.
3. Choose a unique **ID** for your provider (e.g. “my-slack-provider”) with an optional **Description**.
4. Enter your **Client ID** and **Client Secret** from your Slack app.
5. Click **Save**.

When you use tools that require Slack auth using your Arcade account credentials, the Arcade Engine will automatically use this Slack OAuth provider.

### Configuring Slack auth in self-hosted Arcade Engine configuration [Permalink for this section](https://docs.arcade.dev/home/auth-providers/slack\#configuring-slack-auth-in-self-hosted-arcade-engine-configuration)

### Set environment variables [Permalink for this section](https://docs.arcade.dev/home/auth-providers/slack\#set-environment-variables)

Set the following environment variables:

```nextra-code
export SLACK_CLIENT_ID="<your client ID>"
export SLACK_CLIENT_SECRET="<your client secret>"
```

Or, you can set these values in a `.env` file:

```nextra-code
SLACK_CLIENT_ID="<your client ID>"
SLACK_CLIENT_SECRET="<your client secret>"
```

See [Engine configuration](https://docs.arcade.dev/home/configure/engine) for more information on how
to set environment variables and configure the Arcade Engine.

### Edit the Engine configuration [Permalink for this section](https://docs.arcade.dev/home/auth-providers/slack\#edit-the-engine-configuration)

Edit the `engine.yaml` file and add a `slack` item to the `auth.providers` section:

```nextra-code
auth:
  providers:
    - id: default-slack
      description: "The default Slack provider"
      enabled: true
      type: oauth2
      provider_id: slack
      client_id: ${env:SLACK_CLIENT_ID}
      client_secret: ${env:SLACK_CLIENT_SECRET}
```

## Using Slack auth in app code [Permalink for this section](https://docs.arcade.dev/home/auth-providers/slack\#using-slack-auth-in-app-code)

Use the Slack auth provider in your own agents and AI apps to get a user token for the Slack API. See [authorizing agents with Arcade](https://docs.arcade.dev/home/auth/how-arcade-helps) to understand how this works.

Use `client.auth.start()` to get a user token for the Slack API:

PythonJavaScript

```nextra-code
from arcadepy import Arcade

client = Arcade()  # Automatically finds the `ARCADE_API_KEY` env variable

user_id = "user@example.com"

# Start the authorization process
auth_response = client.auth.start(
    user_id=user_id,
    provider="slack",
    scopes=[\
        "chat:write",\
        "im:write",\
        "users.profile:read",\
        "users:read",\
    ],
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
let authResponse = await client.auth.start(userId, "slack", {
  scopes: ["chat:write", "im:write", "users.profile:read", "users:read"],
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

## Using Slack auth in custom tools [Permalink for this section](https://docs.arcade.dev/home/auth-providers/slack\#using-slack-auth-in-custom-tools)

You can use the pre-built [Arcade Slack toolkit](https://docs.arcade.dev/toolkits/social-communication/slack) to quickly build agents and AI apps that interact with Slack.

If the pre-built tools in the Slack toolkit don’t meet your needs, you can author your own [custom tools](https://docs.arcade.dev/home/build-tools/create-a-toolkit) that interact with the Slack API.

Use the `Slack()` auth class to specify that a tool requires authorization with Slack. The `context.authorization.token` field will be automatically populated with the user’s Slack token:

```nextra-code
from typing import Annotated

from slack_sdk import WebClient

from arcade.sdk import ToolContext, tool
from arcade.sdk.auth import Slack
from arcade.sdk.errors import RetryableToolError


@tool(
    requires_auth=Slack(
        scopes=[\
            "chat:write",\
            "im:write",\
            "users.profile:read",\
            "users:read",\
        ],
    )
)
def send_dm_to_user(
    context: ToolContext,
    user_name: Annotated[\
        str,\
        "The Slack username of the person you want to message. Slack usernames are ALWAYS lowercase.",\
    ],
    message: Annotated[str, "The message you want to send"],
):
    """Send a direct message to a user in Slack."""

    slackClient = WebClient(token=context.authorization.token)

    # Retrieve the user's Slack ID based on their username
    userListResponse = slackClient.users_list()
    user_id = None
    for user in userListResponse["members"]:
        if user["name"].lower() == user_name.lower():
            user_id = user["id"]
            break

    if not user_id:
        raise RetryableToolError(
            "User not found",
            developer_message=f"User with username '{user_name}' not found.",
        )

    # Step 2: Retrieve the DM channel ID with the user
    im_response = slackClient.conversations_open(users=[user_id])
    dm_channel_id = im_response["channel"]["id"]

    # Step 3: Send the message as if it's from you (because we're using a user token)
    slackClient.chat_postMessage(channel=dm_channel_id, text=message)
```

[Reddit](https://docs.arcade.dev/home/auth-providers/reddit "Reddit") [Spotify](https://docs.arcade.dev/home/auth-providers/spotify "Spotify")