---
url: "https://docs.arcade.dev/home/build-tools/create-a-tool-with-auth"
title: "Arcade Docs"
---

[Home](https://docs.arcade.dev/home "Home") [Build tools](https://docs.arcade.dev/home/build-tools/create-a-toolkit "Build tools") Create a tool with auth

# Adding user authorization to your tools

In this guide, you’ll learn how to add user authorization to your custom tools, using Arcade.

You’ll create a tool that sends a message on behalf of a user via Slack.

### Prerequisites [Permalink for this section](https://docs.arcade.dev/home/build-tools/create-a-tool-with-auth\#prerequisites)

- [Set up Arcade](https://docs.arcade.dev/home/quickstart)
- Install the Arcade SDK and any third-party SDKs you need (e.g., Slack SDK):
- [Understand Tool Context](https://docs.arcade.dev/home/build-tools/tool-context)

```nextra-code
pip install arcade-ai slack_sdk
```

### Define your authorized tool [Permalink for this section](https://docs.arcade.dev/home/build-tools/create-a-tool-with-auth\#define-your-authorized-tool)

Create a new Python file, e.g., `slack_tools.py`, and import the necessary modules:

```nextra-code
from typing import Annotated

from arcade.sdk import ToolContext, tool
from arcade.sdk.auth import Slack
from arcade.sdk.errors import RetryableToolError
from slack_sdk import WebClient
```

Now, define your tool using the `@tool` decorator and specify the required authorization, in this case, by using the built-in `Slack` auth provider:

```nextra-code
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
    user_name: Annotated[str, "The Slack username of the person you want to message"],
    message: Annotated[str, "The message you want to send"],
):
    """Send a direct message to a user in Slack."""
    slack_client = WebClient(token=context.authorization.token)

    # Retrieve the user ID based on username
    user_list_response = slack_client.users_list()
    user_id = None
    for user in user_list_response["members"]:
        if user["name"].lower() == user_name.lower():
            user_id = user["id"]
            break
    if not user_id:
        raise RetryableToolError(
            "User not found",
            developer_message=f"User with username '{user_name}' not found."
        )

    # Open a conversation and send the message
    im_response = slack_client.conversations_open(users=[user_id])
    dm_channel_id = im_response["channel"]["id"]
    slack_client.chat_postMessage(channel=dm_channel_id, text=message)
```

Arcade offers a number of [built-in auth providers](https://docs.arcade.dev/home/auth-providers), including Slack, Google, and GitHub. You can also require authorization with a custom auth provider, using the `OAuth2` class, a subclass of the `ToolAuthorization` class:

```nextra-code
@tool(
    requires_auth=OAuth2(
        id="your-oauth-provider-id",
        scopes=["scope1", "scope2"],
    )
)
```

The `OAuth2` class requires an `id` parameter to identify the auth provider in the Arcade Engine. For built-in providers like `Slack`, you can skip the `id` \- the Arcade Engine will find the right provider using your credentials. While you can specify an `id` for built-in providers, only do this for private tools that won’t be shared.

### Use your authorized tool with Arcade [Permalink for this section](https://docs.arcade.dev/home/build-tools/create-a-tool-with-auth\#use-your-authorized-tool-with-arcade)

Now you can use your custom authorized tool with Arcade in your application.

Here’s an example of how to use your tool:

```nextra-code
from arcadepy import Arcade
from catalog import catalog

client = Arcade()  # Automatically finds the `ARCADE_API_KEY` env variable

user_id = "user@example.com"

# Use the tool
response = client.tools.execute(
    tool_name="Slack.SendDmToUser",
    input={
        "user_name": "johndoe",
        "message": "Hello!",
    },
    user_id=user_id,
)

print(response.output.value)
```

### Handle authorization [Permalink for this section](https://docs.arcade.dev/home/build-tools/create-a-tool-with-auth\#handle-authorization)

Since your tool requires authorization, the first time you use it, the user (identified by `user_id`) needs to authorize access.

Arcade handles the authorization flow, prompting the user to visit a URL to grant permissions.

Your application should guide the user through this process.

### How it works [Permalink for this section](https://docs.arcade.dev/home/build-tools/create-a-tool-with-auth\#how-it-works)

By specifying the `requires_auth` parameter in the `@tool` decorator, you indicate that the tool needs user authorization.

Arcade manages the OAuth flow, and provides the token in `context.authorization.token` when the tool is executed. Arcade also remembers the user’s authorization tokens, so they won’t have to go through the authorization process again until the auth expires or is revoked.

### Next steps [Permalink for this section](https://docs.arcade.dev/home/build-tools/create-a-tool-with-auth\#next-steps)

Try adding more authorized tools, or explore how to handle different authorization providers and scopes.

[Tool Context](https://docs.arcade.dev/home/build-tools/tool-context "Tool Context") [Create a tool with secrets](https://docs.arcade.dev/home/build-tools/create-a-tool-with-secrets "Create a tool with secrets")