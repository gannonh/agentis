---
url: "https://docs.arcade.dev/home/auth-providers/google"
title: "Arcade Docs"
---

[Home](https://docs.arcade.dev/home "Home") [Customizing Auth](https://docs.arcade.dev/home/auth-providers "Customizing Auth") Google

# Google auth provider

The Google auth provider enables tools and agents to call Google/Google Workspace APIs on behalf of a user. Behind the scenes, the Arcade Engine and the Google auth provider seamlessly manage Google OAuth 2.0 authorization for your users.

Want to quickly get started with Google services in your agent or AI app? The
pre-built [Arcade Google toolkit](https://docs.arcade.dev/toolkits/productivity/google/gmail) is what
you want!

### What’s documented here [Permalink for this section](https://docs.arcade.dev/home/auth-providers/google\#whats-documented-here)

This page describes how to use and configure Google auth with Arcade.

This auth provider is used by:

- The [Arcade Google toolkit](https://docs.arcade.dev/toolkits/productivity/google/gmail), which provides pre-built tools for interacting with Google services
- Your [app code](https://docs.arcade.dev/home/auth-providers/google#using-google-auth-in-app-code) that needs to call Google APIs
- Or, your [custom tools](https://docs.arcade.dev/home/auth-providers/google#using-google-auth-in-custom-tools) that need to call Google APIs

## Configuring Google auth [Permalink for this section](https://docs.arcade.dev/home/auth-providers/google\#configuring-google-auth)

How you configure the Google auth provider depends on whether you use the Arcade Cloud Engine or a [self-hosted Engine](https://docs.arcade.dev/home/install/overview).

With the Arcade Cloud Engine, you can start building and testing Google auth without any configuration. Your users will see `Arcade (demo)` as the name of the application that’s requesting permission.

When you are ready to go to production, you’ll want to configure the Google auth provider with your own Google app credentials, so users see your app name when they authorize access.

### Create a Google app [Permalink for this section](https://docs.arcade.dev/home/auth-providers/google\#create-a-google-app)

- Follow Google’s guide to [setting up OAuth credentials](https://support.google.com/cloud/answer/6158849?hl=en)
- Choose the [scopes](https://developers.google.com/identity/protocols/oauth2/scopes) (permissions) you need for your app
- At a minimum, you must enable these scopes:
  - `https://www.googleapis.com/auth/userinfo.email`
  - `https://www.googleapis.com/auth/userinfo.profile`
- Set the redirect URL to: `https://cloud.arcade.dev/api/v1/oauth/callback`
- Copy the client ID and client secret to use below

Next, add the Google app to your Arcade Engine configuration. You can do this in the Arcade Dashboard, or by editing the `engine.yaml` file directly (for a self-hosted instance).

### Configuring Google auth with the Arcade Dashboard [Permalink for this section](https://docs.arcade.dev/home/auth-providers/google\#configuring-google-auth-with-the-arcade-dashboard)

1. Navigate to the OAuth section of the Arcade Dashboard and click **Add OAuth Provider**.
2. Select **Google** as the provider.
3. Choose a unique **ID** for your provider (e.g. “my-google-provider”) with an optional **Description**.
4. Enter your **Client ID** and **Client Secret** from your Google app.
5. Click **Save**.

When you use tools that require Google auth using your Arcade account credentials, the Arcade Engine will automatically use this Google OAuth provider.

### Configuring Google auth in self-hosted Arcade Engine configuration [Permalink for this section](https://docs.arcade.dev/home/auth-providers/google\#configuring-google-auth-in-self-hosted-arcade-engine-configuration)

### Set environment variables [Permalink for this section](https://docs.arcade.dev/home/auth-providers/google\#set-environment-variables)

Set the following environment variables:

```nextra-code
export GOOGLE_CLIENT_ID="<your client ID>"
export GOOGLE_CLIENT_SECRET="<your client secret>"
```

Or, you can set these values in a `.env` file:

```nextra-code
GOOGLE_CLIENT_ID="<your client ID>"
GOOGLE_CLIENT_SECRET="<your client secret>"
```

See [Engine configuration](https://docs.arcade.dev/home/configure/engine) for more information on how
to set environment variables and configure the Arcade Engine.

### Edit the Engine configuration [Permalink for this section](https://docs.arcade.dev/home/auth-providers/google\#edit-the-engine-configuration)

Edit the `engine.yaml` file and add a `google` item to the `auth.providers` section:

```nextra-code
auth:
  providers:
    - id: default-google
      description: "The default Google provider"
      enabled: true
      type: oauth2
      provider_id: google
      client_id: ${env:GOOGLE_CLIENT_ID}
      client_secret: ${env:GOOGLE_CLIENT_SECRET}
```

## Using Google auth in app code [Permalink for this section](https://docs.arcade.dev/home/auth-providers/google\#using-google-auth-in-app-code)

Use the Google auth provider in your own agents and AI apps to get a user token for Google APIs. See [authorizing agents with Arcade](https://docs.arcade.dev/home/auth/how-arcade-helps) to understand how this works.

Use `client.auth.start()` to get a user token for Google APIs:

PythonJavaScript

```nextra-code
from arcadepy import Arcade
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

client = Arcade()  # Automatically finds the `ARCADE_API_KEY` env variable

user_id = "user@example.com"

"""
In this example, we will use Arcade to authenticate with Google and
retrieve Gmail messages.

There is a tool for that in the Arcade SDK, which simplifies the process for
you to retrieve email messages either through our Python or JavaScript
SDKs or via LLM tool calling.

Below we are just showing how to use Arcade as an auth provider, if you ever
need to.
"""

# Start the authorization process
auth_response = client.auth.start(
    user_id=user_id,
    provider="google",
    scopes=["https://www.googleapis.com/auth/gmail.readonly"],
)

if auth_response.status != "completed":
    print("Please complete the authorization challenge in your browser:")
    print(auth_response.url)

# Wait for the authorization to complete
auth_response = client.auth.wait_for_completion(auth_response)

token = auth_response.context.token

if not token:
    raise ValueError("No token found in auth response")

credentials = Credentials(token)
gmail = build("gmail", "v1", credentials=credentials)

email_messages = (
    gmail.users().messages().list(userId="me").execute().get("messages", [])
)

print(email_messages)
```

```nextra-code
import { Arcade } from "@arcadeai/arcadejs";

const client = new Arcade(); // Automatically finds the `ARCADE_API_KEY` env variable

const userId = "user@example.com";

/*
In this example, we will use Arcade to authenticate with Google and
retrieve Gmail messages.

There is a tool for that in the Arcade SDK, which simplifies the process for
you to retrieve email messages either through our Python or JavaScript
SDKs or via LLM tool calling.

Below we are just showing how to use Arcade as an auth provider, if you ever
need to.
*/

// Start the authorization process
let authResponse = await client.auth.start(userId, "google", {
  scopes: ["https://www.googleapis.com/auth/gmail.readonly"],
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

// Use the Google Gmail API
const response = await fetch(
  "https://gmail.googleapis.com/gmail/v1/users/me/messages",
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  },
);

if (!response.ok) {
  throw new Error(`HTTP error! status: ${response.status}`);
}

const data = await response.json();
const emailMessages = data.messages || [];

// Return a list of ids and thread ids
console.log(emailMessages);
```

## Using Google auth in custom tools [Permalink for this section](https://docs.arcade.dev/home/auth-providers/google\#using-google-auth-in-custom-tools)

You can use the pre-built [Arcade Google toolkit](https://docs.arcade.dev/toolkits/productivity/google/gmail) to quickly build agents and AI apps that interact with Google services like Gmail, Calendar, Drive, and more.

If the pre-built tools in the Google toolkit don’t meet your needs, you can author your own [custom tools](https://docs.arcade.dev/home/build-tools/create-a-toolkit) that interact with Google APIs.

Use the `Google()` auth class to specify that a tool requires authorization with Google. The `context.authorization.token` field will be automatically populated with the user’s Google token:

```nextra-code
from typing import Annotated

from arcade.sdk import ToolContext, tool
from arcade.sdk.auth import Google

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build


@tool(
    requires_auth=Google(
        scopes=["https://www.googleapis.com/auth/gmail.readonly"],
    )
)
async def list_emails(
    context: ToolContext,
    subject: Annotated[str, "The subject of the email"],
    body: Annotated[str, "The body of the email"],
    recipient: Annotated[str, "The recipient of the email"],
) -> Annotated[str, "A confirmation message with the sent email ID and URL"]:
    """
    Send an email using the Gmail API.
    """
    if not context.authorization or not context.authorization.token:
        raise ValueError("No token found in context")

    credentials = Credentials(context.authorization.token)
    gmail = build("gmail", "v1", credentials=credentials)

    email_messages = (
        gmail.users().messages().list(userId="me").execute().get("messages", [])
    )

    return email_messages
```

[GitHub](https://docs.arcade.dev/home/auth-providers/github "GitHub") [Hubspot](https://docs.arcade.dev/home/auth-providers/hubspot "Hubspot")