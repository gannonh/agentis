---
url: "https://docs.arcade.dev/home/crewai/use-arcade-tools"
title: "Arcade Docs"
---

[Home](https://docs.arcade.dev/home "Home") CrewAIUsing Arcade tools

## Use CrewAI with Arcade [Permalink for this section](https://docs.arcade.dev/home/crewai/use-arcade-tools\#use-crewai-with-arcade)

In this guide, we will explore how to integrate Arcade tools into your CrewAI application. Follow the step-by-step instructions below. If a tool requires authorization, an authorization URL will appear in the console, waiting for your approval. This process ensures that only the tools you choose to authorize are executed.

To tailor the tool authorization flow to meet your application’s specific needs, check out the [Custom Auth Flow with CrewAI](https://docs.arcade.dev/home/crewai/custom-auth-flow) guide.

### Prerequisites [Permalink for this section](https://docs.arcade.dev/home/crewai/use-arcade-tools\#prerequisites)

- [Obtain an Arcade API key](https://docs.arcade.dev/home/api-keys)

### Set up your environment [Permalink for this section](https://docs.arcade.dev/home/crewai/use-arcade-tools\#set-up-your-environment)

Install the required package, and ensure your environment variables are set with your Arcade and OpenAI API keys:

```nextra-code
pip install crewai-arcade
```

### Configure API keys [Permalink for this section](https://docs.arcade.dev/home/crewai/use-arcade-tools\#configure-api-keys)

Provide your Arcade and OpenAI API keys. You can store them in environment variables like so:

```nextra-code
export ARCADE_API_KEY="your_arcade_api_key"
export OPENAI_API_KEY="your_openai_api_key"
```

### Get Arcade tools [Permalink for this section](https://docs.arcade.dev/home/crewai/use-arcade-tools\#get-arcade-tools)

Use the `ArcadeToolManager` to initialize, add, and get Arcade tools:

```nextra-code
from crewai_arcade import ArcadeToolManager

manager = ArcadeToolManager(default_user_id="user@example.com")

"""
Retrieves the provided tools and/or toolkits as CrewAI StructuredTools.
"""
tools = manager.get_tools(tools=["Google.ListEmails"], toolkits=["Slack"])
```

### Use tools in your CrewAI agent team [Permalink for this section](https://docs.arcade.dev/home/crewai/use-arcade-tools\#use-tools-in-your-crewai-agent-team)

Create a Crew that uses your tools. When the tool is called, you will be prompted to go visit an authorization page to authorize the tool before it executes.

```nextra-code
from crewai import Agent, Crew, Task
from crewai.llm import LLM

crew_agent = Agent(
    role="Main Agent",
    backstory="You are a helpful assistant",
    goal="Help the user with their requests",
    tools=tools,
    allow_delegation=False,
    verbose=True,
    llm=LLM(model="gpt-4o"),
)

task = Task(
    description="Get the 5 most recent emails from the user's inbox and summarize them and recommend a response for each.",
    expected_output="A bulleted list with a one sentence summary of each email and a recommended response to the email.",
    agent=crew_agent,
    tools=crew_agent.tools,
)

crew = Crew(
    agents=[crew_agent],
    tasks=[task],
    verbose=True,
    memory=True,
)

result = crew.kickoff()

print("\n\n\n ------------ Result ------------ \n\n\n")
print(result)
```

Click to view a full example

## Tips for selecting tools [Permalink for this section](https://docs.arcade.dev/home/crewai/use-arcade-tools\#tips-for-selecting-tools)

- **Relevance**: Pick only the tools you need. Avoid using all tools at once.
- **Avoid conflicts**: Be mindful of duplicate or overlapping functionality.

## Next steps [Permalink for this section](https://docs.arcade.dev/home/crewai/use-arcade-tools\#next-steps)

Now that you have integrated Arcade tools into your CrewAI agent team, you can:

- Experiment with different toolkits, such as “Math” or “Search.”
- Customize the agent’s prompts for specific tasks.
- Customize the tool authorization and execution flow to meet your application’s requirements.

[Managing user authorization](https://docs.arcade.dev/home/oai-agents/user-auth-interrupts "Managing user authorization") [Custom auth flow](https://docs.arcade.dev/home/crewai/custom-auth-flow "Custom auth flow")