---
url: "https://docs.arcade.dev/home/auth-providers/github"
title: "Arcade Docs"
---

[Home](https://docs.arcade.dev/home "Home") [Customizing Auth](https://docs.arcade.dev/home/auth-providers "Customizing Auth") GitHub

# GitHub auth provider

The GitHub auth provider enables tools and agents to call [GitHub APIs](https://docs.github.com/en/rest/overview/resources-in-the-rest-api) on behalf of a user. Behind the scenes, the Arcade Engine and the GitHub auth provider seamlessly manage GitHub OAuth 2.0 authorization for your users.

Want to quickly get started with GitHub in your agent or AI app? The pre-built
[Arcade GitHub toolkit](https://docs.arcade.dev/toolkits/development/github/github) is what you want!

### What’s documented here [Permalink for this section](https://docs.arcade.dev/home/auth-providers/github\#whats-documented-here)

This page describes how to use and configure GitHub auth with Arcade.

This auth provider is used by:

- The [Arcade GitHub toolkit](https://docs.arcade.dev/toolkits/development/github/github), which provides pre-built tools for interacting with GitHub
- Your [app code](https://docs.arcade.dev/home/auth-providers/github#using-github-auth-in-app-code) that needs to call the GitHub API
- Or, your [custom tools](https://docs.arcade.dev/home/auth-providers/github#using-github-auth-in-custom-tools) that need to call the GitHub API

## Configuring GitHub auth [Permalink for this section](https://docs.arcade.dev/home/auth-providers/github\#configuring-github-auth)

How you configure the GitHub auth provider depends on whether you use the Arcade Cloud Engine or a [self-hosted Engine](https://docs.arcade.dev/home/install/overview).

With the Arcade Cloud Engine, you can start building and testing GitHub auth without any configuration. Your users will see `Arcade.dev` as the name of the application that’s requesting permission.

When you are ready to go to production, you’ll want to configure the GitHub auth provider with your own GitHub app credentials, so users see your app name when they authorize access.

### Create a GitHub app [Permalink for this section](https://docs.arcade.dev/home/auth-providers/github\#create-a-github-app)

- Follow GitHub’s guide to [registering a GitHub app](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app)
- Choose the permissions you need for your app
  - At a minimum, you must enable read-only access to the Account > Email addresses permission
  - To access repo data, you must enable at least the Repository > Contents permission
- Set the redirect URL to: `https://cloud.arcade.dev/api/v1/oauth/callback`
- Leave “Request user authorization (OAuth) during installation” **unchecked**
- Leave “Setup URL” blank and “Redirect on update” **unchecked**
- Ensure Optional features > User-to-server token expiration is enabled
- Copy the client ID and generate a client secret to use below

If you need to access private repositories in an organization, you must also:

1. Make the app public via Advanced > Make public
2. Add the app to the organization via Install app

Next, add the GitHub app to your Arcade Engine configuration. You can do this in the Arcade Dashboard, or by editing the `engine.yaml` file directly (for a self-hosted instance).

### Configuring GitHub auth with the Arcade Dashboard [Permalink for this section](https://docs.arcade.dev/home/auth-providers/github\#configuring-github-auth-with-the-arcade-dashboard)

1. Navigate to the OAuth section of the Arcade Dashboard and click **Add OAuth Provider**.
2. Select **GitHub** as the provider.
3. Choose a unique **ID** for your provider (e.g. “my-github-provider”) with an optional **Description**.
4. Enter your **Client ID** and **Client Secret** from your GitHub app.
5. Click **Save**.

When you use tools that require GitHub auth using your Arcade account credentials, the Arcade Engine will automatically use this GitHub OAuth provider.

### Configuring GitHub auth in self-hosted Arcade Engine configuration [Permalink for this section](https://docs.arcade.dev/home/auth-providers/github\#configuring-github-auth-in-self-hosted-arcade-engine-configuration)

### Set environment variables [Permalink for this section](https://docs.arcade.dev/home/auth-providers/github\#set-environment-variables)

Set the following environment variables:

```nextra-code
export GITHUB_CLIENT_ID="<your client ID>"
export GITHUB_CLIENT_SECRET="<your client secret>"
```

Or, you can set these values in a `.env` file:

```nextra-code
GITHUB_CLIENT_ID="<your client ID>"
GITHUB_CLIENT_SECRET="<your client secret>"
```

See [Engine configuration](https://docs.arcade.dev/home/configure/engine) for more information on how
to set environment variables and configure the Arcade Engine.

### Edit the Engine configuration [Permalink for this section](https://docs.arcade.dev/home/auth-providers/github\#edit-the-engine-configuration)

Edit the `engine.yaml` file and add a `github` item to the `auth.providers` section:

```nextra-code
auth:
  providers:
    - id: default-github
      description: "The default GitHub provider"
      enabled: true
      type: oauth2
      provider_id: github
      client_id: ${env:GITHUB_CLIENT_ID}
      client_secret: ${env:GITHUB_CLIENT_SECRET}
```

## Using GitHub auth in app code [Permalink for this section](https://docs.arcade.dev/home/auth-providers/github\#using-github-auth-in-app-code)

Use the GitHub auth provider in your own agents and AI apps to get a user token for the GitHub API. See [authorizing agents with Arcade](https://docs.arcade.dev/home/auth/how-arcade-helps) to understand how this works.

Use `client.auth.start()` to get a user token for the GitHub API:

PythonJavaScript

```nextra-code
import requests
from arcadepy import Arcade

client = Arcade()  # Automatically finds the `ARCADE_API_KEY` env variable

user_id = "user@example.com"

"""
In this example, we will use Arcade to authenticate with GitHub and retrieve
the number of stargazers of the ArcadeAI/arcade-ai repository.

There is a tool for that in the Arcade SDK, which simplifies the process for
you to interact with GitHub either through our Python or JavaScript SDKs or via
LLM tool calling.

Below we are just showing how to use Arcade as an auth provider, if you ever
need to.
"""

# Start the authorization process
auth_response = client.auth.start(
    user_id=user_id,
    provider="github",
)

if auth_response.status != "completed":
    print("Please complete the authorization challenge in your browser:")
    print(auth_response.url)

# Wait for the authorization to complete
auth_response = client.auth.wait_for_completion(auth_response)

if not auth_response.context.token:
    raise ValueError("No token found in auth response")

token = auth_response.context.token

owner = "ArcadeAI"
name = "arcade-ai"
headers = {
    "Accept": "application/vnd.github+json",
    "Authorization": f"Bearer {token}",
    "X-GitHub-Api-Version": "2022-11-28",
}
url = f"https://api.github.com/repos/{owner}/{name}"

response = requests.get(url, headers=headers)
response.raise_for_status()

print(response.json().get("stargazers_count"))
```

```nextra-code
import { Arcade } from "@arcadeai/arcadejs";

const client = new Arcade(); // Automatically finds the `ARCADE_API_KEY` env variable

const userId = "user@example.com";

/*
In this example, we will use Arcade to authenticate with GitHub and retrieve
the number of stargazers of the ArcadeAI/arcade-ai repository.

There is a tool for that in the Arcade SDK, which simplifies the process for
you to interact with GitHub either through our Python or JavaScript SDKs or via
LLM tool calling.

Below we are just showing how to use Arcade as an auth provider, if you ever
need to.
*/

// Start the authorization process
let authResponse = await client.auth.start(userId, "github");

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

const owner = "ArcadeAI";
const name = "arcade-ai";
const headers = {
  Accept: "application/vnd.github+json",
  Authorization: `Bearer ${token}`,
  "X-GitHub-Api-Version": "2022-11-28",
};
const url = `https://api.github.com/repos/${owner}/${name}`;

const response = await fetch(url, { headers });
if (!response.ok) {
  throw new Error(`HTTP error! status: ${response.status}`);
}
const data = await response.json();
console.log(data.stargazers_count);
```

## Using GitHub auth in custom tools [Permalink for this section](https://docs.arcade.dev/home/auth-providers/github\#using-github-auth-in-custom-tools)

You can use the pre-built [Arcade GitHub toolkit](https://docs.arcade.dev/toolkits/development/github/github) to quickly build agents and AI apps that interact with GitHub.

If the pre-built tools in the GitHub toolkit don’t meet your needs, you can author your own [custom tools](https://docs.arcade.dev/home/build-tools/create-a-toolkit) that interact with the GitHub API.

Use the `GitHub()` auth class to specify that a tool requires authorization with GitHub. The `context.authorization.token` field will be automatically populated with the user’s GitHub token:

```nextra-code
from typing import Annotated

import httpx
from arcade.sdk import ToolContext, tool
from arcade.sdk.auth import GitHub


@tool(requires_auth=GitHub())
async def count_stargazers(
    context: ToolContext,
    owner: Annotated[str, "The owner of the repository"],
    name: Annotated[str, "The name of the repository"],
) -> Annotated[int, "The number of stargazers (stars) for the specified repository"]:
    """Count the number of stargazers (stars) for a GitHub repository."""
    if not context.authorization or not context.authorization.token:
        raise ValueError("No token found in context")

    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {context.authorization.token}",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    url = f"https://api.github.com/repos/{owner}/{name}"

    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers)
        response.raise_for_status()
        return response.json().get("stargazers_count", 0)
```

[Dropbox](https://docs.arcade.dev/home/auth-providers/dropbox "Dropbox") [Google](https://docs.arcade.dev/home/auth-providers/google "Google")