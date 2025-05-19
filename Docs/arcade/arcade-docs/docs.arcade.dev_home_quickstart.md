---
url: "https://docs.arcade.dev/home/quickstart"
title: "Arcade Docs"
---

[Home](https://docs.arcade.dev/home "Home") Quickstart

# Arcade Quickstart

This guide will walk you through the process of getting started with Arcade.dev. First, we will go over Direct Tool Calling, a simple way to call tools directly from your agent.

Direct tool calling is useful in situations where you already know what tool is needed or when there is no prompt for an LLM to interpret and decide on the tool calling. It also gives you full control over what is executed by the Arcade Engine and how.

### Prerequisites [Permalink for this section](https://docs.arcade.dev/home/quickstart\#prerequisites)

1. Create an [Arcade account](https://api.arcade.dev/signup?utm_source=docs&utm_medium=page&utm_campaign=call-tools-directly)
2. Get an [Arcade API key](https://docs.arcade.dev/home/api-keys) and take note, you’ll need it in the next steps.

### Install the Arcade client [Permalink for this section](https://docs.arcade.dev/home/quickstart\#install-the-arcade-client)

PythonJavaScript

```nextra-code
pip install arcadepy
```

```nextra-code
npm install @arcadeai/arcadejs
```

### Instantiate and use the client [Permalink for this section](https://docs.arcade.dev/home/quickstart\#instantiate-and-use-the-client)

PythonJavaScript

Create a new script called `example.py`:

```nextra-code
from arcadepy import Arcade

# You can also set the `ARCADE_API_KEY` environment variable instead of passing it as a parameter.
client = Arcade(api_key="arcade_api_key")

# Arcade needs a unique identifier for your application user (this could be an email address, a UUID, etc).
# In this example, simply use your email address as the user ID:
user_id = "user@example.com"

# Let's use the `Math.Sqrt` tool from the Arcade Math toolkit to get the square root of a number.
response = client.tools.execute(
    tool_name="Math.Sqrt",
    input={"a": '625'},
    user_id=user_id,
)

print(f"The square root of 625 is {response.output.value}")

# Now, let's use a tool that requires authentication to star a GitHub repository
auth_response = client.tools.authorize(
tool_name="GitHub.SetStarred",
user_id=user_id,
)

if auth_response.status != "completed":
    print(f"Click this link to authorize: `{auth_response.url}`.  The process will continue once you have authorized the app." )
    # Wait for the user to authorize the app
    client.auth.wait_for_completion(auth_response.id);

response = client.tools.execute(
    tool_name="GitHub.SetStarred",
    input={
        "owner": "ArcadeAI",
        "name": "arcade-ai",
        "starred": True,
    },
    user_id=user_id,
)

print(response.output.value)

```

Create a new script called `example.mjs`:

```nextra-code
import Arcade from "@arcadeai/arcadejs";

// You can also set the `ARCADE_API_KEY` environment variable instead of passing it as a parameter.
const client = new Arcade({
  apiKey: "arcade_api_key",
});

// Arcade needs a unique identifier for your application user (this could be an email address, a UUID, etc).
// In this example, simply use your email address as the user ID:
let userId = "you@example.com";

// Let's use the `Math.Sqrt` tool from the Arcade Math toolkit to get the square root of a number.
const response_sqrt = await client.tools.execute({
  tool_name: "Math.Sqrt",
  input: { a: "625" },
  user_id: userId,
});

console.log(response_sqrt.output.value);

// Now, let's use a tool that requires authentication

const authResponse = await client.tools.authorize({
  tool_name: "GitHub.SetStarred",
  user_id: userId,
});

if (authResponse.status !== "completed") {
  console.log(
    `Click this link to authorize: \`${authResponse.url}\`.  The process will continue once you have authorized the app.`,
  );
  // Wait for the user to authorize the app
  await client.auth.waitForCompletion(authResponse.id);
}

const response_github = await client.tools.execute({
  tool_name: "GitHub.SetStarred",
  input: {
    owner: "ArcadeAI",
    name: "arcade-ai",
    starred: true,
  },
  user_id: userId,
});

console.log(response_github.output.value);
```

### Run the code [Permalink for this section](https://docs.arcade.dev/home/quickstart\#run-the-code)

PythonJavaScript

```nextra-code
python3 example.py
> The square root of 625 is 25
> Successfully starred the repository ArcadeAI/arcade-ai
```

```nextra-code
node example.mjs
> The square root of 625 is 25
> Successfully starred the repository ArcadeAI/arcade-ai
```

## Next Steps [Permalink for this section](https://docs.arcade.dev/home/quickstart\#next-steps)

In this simple example, we call the tool methods directly. In your real applications and agents, you’ll likely be letting the LLM decide which tools to call - lean more about using Arcade with Frameworks in the [Frameworks](https://docs.arcade.dev/home/langchain/use-arcade-tools) section, or [how to build your own tools](https://docs.arcade.dev/home/build-tools/create-a-toolkit).

[Contact us](https://docs.arcade.dev/home/contact-us "[object Object]") [Get an API key](https://docs.arcade.dev/home/api-keys "Get an API key")