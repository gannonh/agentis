---
url: "https://docs.arcade.dev/home/oai-agents/overview"
title: "Arcade Docs"
---

[Home](https://docs.arcade.dev/home "Home") OpenAI AgentsOverview

# Arcade with OpenAI Agents

The `agents-arcade` package provides a seamless integration between [Arcade](https://arcade.dev/) and the [OpenAI Agents Library](https://github.com/openai/openai-python). This integration allows you to enhance your AI agents with powerful Arcade tools including Google Mail, LinkedIn, GitHub, and many more.

## Installation [Permalink for this section](https://docs.arcade.dev/home/oai-agents/overview\#installation)

Install the necessary packages to get started:

```nextra-code
pip install agents-arcade arcadepy
```

Make sure you have your Arcade API key ready. [Get an API key](https://docs.arcade.dev/home/api-keys) if you don’t already have one.

## Key features [Permalink for this section](https://docs.arcade.dev/home/oai-agents/overview\#key-features)

- **Easy integration** with the OpenAI Agents framework
- **Access to all Arcade toolkits** including Google, GitHub, LinkedIn, X, and more
- **Create custom tools** with the Arcade Tool SDK
- **Manage user authentication** for tools that require it
- **Asynchronous support** compatible with OpenAI’s Agent framework

## Basic usage [Permalink for this section](https://docs.arcade.dev/home/oai-agents/overview\#basic-usage)

Here’s a simple example of using Arcade tools with OpenAI Agents:

```nextra-code
from agents import Agent, Runner
from arcadepy import AsyncArcade
from agents_arcade import get_arcade_tools
from agents_arcade.errors import AuthorizationError

async def main():
    # Initialize the Arcade client
    client = AsyncArcade()

    # Get tools from the "google" toolkit
    tools = await get_arcade_tools(client, ["google"])

    # Create an agent with Google tools
    google_agent = Agent(
        name="Google agent",
        instructions="You are a helpful assistant that can assist with Google API calls.",
        model="gpt-4o-mini",
        tools=tools,
    )

    try:
        # Run the agent with a unique user_id for authorization
        result = await Runner.run(
            starting_agent=google_agent,
            input="What are my latest emails?",
            context={"user_id": "user@example.com"},
        )
        print("Final output:\n\n", result.final_output)
    except AuthorizationError as e:
        print("Please Login to Google:", e)

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
```

## Handling authorization [Permalink for this section](https://docs.arcade.dev/home/oai-agents/overview\#handling-authorization)

When a user needs to authorize access to a tool (like Google or GitHub), the agent will raise an `AuthorizationError` with a URL for the user to visit:

```nextra-code
try:
    # Run agent code
    # ...
except AuthorizationError as e:
    # Display the authorization URL to the user
    print(f"Please visit this URL to authorize: {e}")
```

After visiting the URL and authorizing access, the user can run the agent again with the same `user_id`, and it will work without requiring re-authorization.

## Available toolkits [Permalink for this section](https://docs.arcade.dev/home/oai-agents/overview\#available-toolkits)

Arcade provides a variety of toolkits you can use with your agents:

- **Google Suite**: Gmail, Calendar, Drive, Docs
- **Social Media**: LinkedIn, X
- **Development**: GitHub
- **Web**: Web search, content extraction
- **And more**: Weather, financial data, etc.

For a full list of available toolkits, visit the [Arcade Integrations](https://docs.arcade.dev/toolkits) documentation.

## Next steps [Permalink for this section](https://docs.arcade.dev/home/oai-agents/overview\#next-steps)

Ready to start building with Arcade and OpenAI Agents? Check out these guides:

- [Using Arcade tools](https://docs.arcade.dev/home/oai-agents/use-arcade-tools) \- Learn the basics of using Arcade tools with OpenAI Agents
- [Managing user authorization](https://docs.arcade.dev/home/oai-agents/user-auth-interrupts) \- Handle tool authorization efficiently
- [Creating custom tools](https://docs.arcade.dev/home/build-tools/create-a-toolkit) \- Build your own tools with the Arcade Tool SDK

Enjoy exploring Arcade and building powerful AI-enabled applications!

[Authorizing existing tools](https://docs.arcade.dev/home/langchain/auth-langchain-tools "Authorizing existing tools") [Using Arcade tools](https://docs.arcade.dev/home/oai-agents/use-arcade-tools "Using Arcade tools")