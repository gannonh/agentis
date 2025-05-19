---
url: "https://docs.arcade.dev/home/auth-providers/linkedin"
title: "Arcade Docs"
---

[Home](https://docs.arcade.dev/home "Home") [Customizing Auth](https://docs.arcade.dev/home/auth-providers "Customizing Auth") Linkedin

# LinkedIn auth provider

The LinkedIn auth provider enables tools and agents to call the LinkedIn API on behalf of a user. Behind the scenes, the Arcade Engine and the LinkedIn auth provider seamlessly manage LinkedIn OAuth 2.0 authorization for your users.

### What’s documented here [Permalink for this section](https://docs.arcade.dev/home/auth-providers/linkedin\#whats-documented-here)

This page describes how to use and configure LinkedIn auth with Arcade.

This auth provider is used by:

- Your [app code](https://docs.arcade.dev/home/auth-providers/linkedin#using-linkedin-auth-in-app-code) that needs to call LinkedIn APIs
- Or, your [custom tools](https://docs.arcade.dev/home/auth-providers/linkedin#using-linkedin-auth-in-custom-tools) that need to call LinkedIn APIs

## Configuring LinkedIn auth [Permalink for this section](https://docs.arcade.dev/home/auth-providers/linkedin\#configuring-linkedin-auth)

How you configure the LinkedIn auth provider depends on whether you use the Arcade Cloud Engine or a [self-hosted Engine](https://docs.arcade.dev/home/install/overview).

With the Arcade Cloud Engine, you can start building and testing LinkedIn auth without any configuration. Your users will see `Arcade (demo)` as the name of the application that’s requesting permission.

When you are ready to go to production, you’ll want to configure the LinkedIn auth provider with your own LinkedIn app credentials, so users see your app name when they authorize access.

### Create a LinkedIn app [Permalink for this section](https://docs.arcade.dev/home/auth-providers/linkedin\#create-a-linkedin-app)

- Follow LinkedIn’s guide to [setting up user authorization](https://learn.microsoft.com/en-us/linkedin/shared/authentication/authentication)
- On the Products tab, add the products you need for your app (e.g. “Share on LinkedIn”)
  - At a minimum, you _must_ add the “Sign In with LinkedIn using OpenID Connect” product
- On the Auth tab, set the redirect URL to: `https://cloud.arcade.dev/api/v1/oauth/callback`
- Copy the client ID and client secret to use below

Next, add the LinkedIn app to your Arcade Engine configuration. You can do this in the Arcade Dashboard, or by editing the `engine.yaml` file directly (for a self-hosted instance).

### Configuring LinkedIn auth with the Arcade Dashboard [Permalink for this section](https://docs.arcade.dev/home/auth-providers/linkedin\#configuring-linkedin-auth-with-the-arcade-dashboard)

1. Navigate to the OAuth section of the Arcade Dashboard and click **Add OAuth Provider**.
2. Select **LinkedIn** as the provider.
3. Choose a unique **ID** for your provider (e.g. “my-linkedin-provider”) with an optional **Description**.
4. Enter your **Client ID** and **Client Secret** from your LinkedIn app.
5. Click **Save**.

When you use tools that require LinkedIn auth using your Arcade account credentials, the Arcade Engine will automatically use this LinkedIn OAuth provider.

### Configuring LinkedIn auth in self-hosted Arcade Engine configuration [Permalink for this section](https://docs.arcade.dev/home/auth-providers/linkedin\#configuring-linkedin-auth-in-self-hosted-arcade-engine-configuration)

### Set environment variables [Permalink for this section](https://docs.arcade.dev/home/auth-providers/linkedin\#set-environment-variables)

Set the following environment variables:

```nextra-code
export LINKEDIN_CLIENT_ID="<your client ID>"
export LINKEDIN_CLIENT_SECRET="<your client secret>"
```

Or, you can set these values in a `.env` file:

```nextra-code
LINKEDIN_CLIENT_ID="<your client ID>"
LINKEDIN_CLIENT_SECRET="<your client secret>"
```

See [Engine configuration](https://docs.arcade.dev/home/configure/engine) for more information on how
to set environment variables and configure the Arcade Engine.

### Edit the Engine configuration [Permalink for this section](https://docs.arcade.dev/home/auth-providers/linkedin\#edit-the-engine-configuration)

Edit the `engine.yaml` file and add a `linkedin` item to the `auth.providers` section:

```nextra-code
auth:
  providers:
    - id: default-linkedin
      description: "The default LinkedIn provider"
      enabled: true
      type: oauth2
      provider_id: linkedin
      client_id: ${env:LINKEDIN_CLIENT_ID}
      client_secret: ${env:LINKEDIN_CLIENT_SECRET}
```

## Using LinkedIn auth in app code [Permalink for this section](https://docs.arcade.dev/home/auth-providers/linkedin\#using-linkedin-auth-in-app-code)

Use the LinkedIn auth provider in your own agents and AI apps to get a user token for LinkedIn APIs. See [authorizing agents with Arcade](https://docs.arcade.dev/home/auth/how-arcade-helps) to understand how this works.

Use `client.auth.start()` to get a user token for LinkedIn APIs:

PythonJavaScript

```nextra-code
import requests

from arcadepy import Arcade


client = Arcade()  # Automatically finds the `ARCADE_API_KEY` env variable

user_id = "user@example.com"

"""
In this example, we will use Arcade to authenticate with LinkedIn and post a
message to the user's LinkedIn feed.

There is a tool for that in the Arcade SDK, which simplifies the process for
you to post messages to the user's LinkedIn feed either through our Python or
JavaScript SDKs or via LLM tool calling.

Below we are just showing how to use Arcade as an auth provider, if you ever
need to.
"""

# Start the authorization process
auth_response = client.auth.start(
    user_id=user_id,
    provider="linkedin",
    scopes=["w_member_social"],
)

if auth_response.status != "completed":
    print("Please complete the authorization challenge in your browser:")
    print(auth_response.url)

# Wait for the authorization to complete
auth_response = client.auth.wait_for_completion(auth_response)

if not auth_response.context.token:
    raise ValueError("No token found in auth response")

token = auth_response.context.token

user_id = (
    None
    if not auth_response.context.authorization
    else auth_response.context.authorization.user_info.get("sub")
)

if not user_id:
    raise ValueError("User ID not found.")

# Prepare the payload data for the LinkedIn API
message = "Hello, from Arcade.dev!"
payload = {
    "author": f"urn:li:person:{user_id}",
    "lifecycleState": "PUBLISHED",
    "specificContent": {
        "com.linkedin.ugc.ShareContent": {
            "shareCommentary": {"text": message},
            "shareMediaCategory": "NONE",
        }
    },
    "visibility": {"com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"},
}

response = requests.post(
    "https://api.linkedin.com/v2/ugcPosts",
    headers={"Authorization": f"Bearer {token}"},
    json=payload,
)
response.raise_for_status()
print(response.json())
```

```nextra-code
import { Arcade } from "@arcadeai/arcadejs";

const client = new Arcade(); // Automatically finds the `ARCADE_API_KEY` env variable

const userId = "user@example.com";

/*
In this example, we will use Arcade to authenticate with LinkedIn and post a
message to the user's LinkedIn feed.

There is a tool for that in the Arcade SDK, which simplifies the process for
you to post messages to the user's LinkedIn feed either through our Python or
JavaScript SDKs or via LLM tool calling.

Below we are just showing how to use Arcade as an auth provider, if you ever
need to.
*/

// Start the authorization process
let authResponse = await client.auth.start(userId, "linkedin", {
  scopes: ["w_member_social"],
});

if (authResponse.status !== "completed") {
  console.log("Please complete the authorization challenge in your browser:");
  console.log(authResponse.url);
}

// Wait for the authorization to complete
authResponse = await client.auth.waitForCompletion(authResponse);

if (!authResponse.context.token) {
  throw new Error("No token found in auth response");
}

const token = authResponse.context.token;

const linkedInUserId = authResponse.context.authorization?.user_info?.sub;

if (!linkedInUserId) {
  throw new Error("User ID not found.");
}

// Prepare the payload data for the LinkedIn API
const message = "Hello, from Arcade.dev!";
const payload = {
  author: `urn:li:person:${linkedInUserId}`,
  lifecycleState: "PUBLISHED",
  specificContent: {
    "com.linkedin.ugc.ShareContent": {
      shareCommentary: { text: message },
      shareMediaCategory: "NONE",
    },
  },
  visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
};

const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(payload),
});

if (!response.ok) {
  throw new Error(`HTTP error! status: ${response.status}`);
}

const data = await response.json();
console.log(data);
```

## Using LinkedIn auth in custom tools [Permalink for this section](https://docs.arcade.dev/home/auth-providers/linkedin\#using-linkedin-auth-in-custom-tools)

You can author your own [custom tools](https://docs.arcade.dev/home/build-tools/create-a-toolkit) that interact with LinkedIn APIs.

Use the `LinkedIn()` auth class to specify that a tool requires authorization with LinkedIn. The `context.authorization.token` field will be automatically populated with the user’s LinkedIn token:

```nextra-code
from typing import Annotated

import httpx

from arcade.sdk.errors import ToolExecutionError
from arcade.sdk import ToolContext, tool
from arcade.sdk.auth import LinkedIn


@tool(
    requires_auth=LinkedIn(
        scopes=["w_member_social"],
    )
)
async def create_text_post(
    context: ToolContext,
    text: Annotated[str, "The text content of the post"],
) -> Annotated[str, "URL of the shared post"]:
    """Share a new text post to LinkedIn."""
    endpoint = "/ugcPosts"

    # The LinkedIn user ID is required to create a post, even though we're using the user's access token.
    # Arcade Engine gets the current user's info from LinkedIn and automatically populates context.authorization.user_info.
    # LinkedIn calls the user ID "sub" in their user_info data payload. See:
    # https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2#api-request-to-retreive-member-details
    user_id = context.authorization.user_info.get("sub")
    if not user_id:
        raise ToolExecutionError(
            "User ID not found.",
            developer_message="User ID not found in `context.authorization.user_info.sub`",
        )

    headers = {"Authorization": f"Bearer {context.authorization.token}"}

    author_id = f"urn:li:person:{user_id}"
    payload = {
        "author": author_id,
        "lifecycleState": "PUBLISHED",
        "specificContent": {
            "com.linkedin.ugc.ShareContent": {
                "shareCommentary": {"text": text},
                "shareMediaCategory": "NONE",
            }
        },
        "visibility": {"com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"},
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(
            url=f"https://api.linkedin.com/v2/{endpoint}",
            headers=headers,
            json=payload,
        )
        response.raise_for_status()
        share_id = response.json().get("id")
        return f"https://www.linkedin.com/feed/update/{share_id}/"
```

[Hubspot](https://docs.arcade.dev/home/auth-providers/hubspot "Hubspot") [Microsoft](https://docs.arcade.dev/home/auth-providers/microsoft "Microsoft")