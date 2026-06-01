# Agentis

Agentis is a platform for building, deploying, and managing AI agents, made by the team at Airtable. You get a powerful autonomous agent that can run for extended periods on open-ended work, doing in minutes or hours what would take a person days. It uses a full computing environment, learns new tools and APIs as it goes, and chains them together to produce finished deliverables.

Teach it how your team works and it becomes an expert in your specific domain. When something works, promote it into a deployable agent that your whole team can use, then monitor and improve performance across your entire fleet. The platform is built to be secure and scalable, so it grows with you.

## Threads

A thread is where work happens, and where many users start with Agentis. You have access to a state-of-the-art autonomous agent with a full computing environment: a browser, a shell, a file system, code execution, image, video, and audio generation, and hundreds of enterprise integrations. Give the agent a task and it gets to work, chaining tools together across long-running, multi-step workflows to produce real deliverables.

Threads are scoped to the tools you give them access to. You pick the integrations (Slack, Google Drive, Airtable, Salesforce, Databricks, and hundreds more), and if one isn't connected yet, you authenticate it right from the conversation. You can specify an output type up front (a webpage, slides, a video, an app) or let the agent decide based on what you're asking for.

Threads are iterative. Keep chatting to refine the output, add constraints, or redirect the approach. When a thread produces a workflow you want to repeat, you can promote it into an agent that runs on its own.

**Examples**

**Research and synthesis.** "I have an account meeting with [Company X] tomorrow. Pull recent activity from Salesforce, check for any Slack threads where we've discussed them, grab their latest earnings call, and build me a prep doc." The agent searches the web, pulls from your connected tools, cross-references everything, and produces a formatted brief.

**Data analysis across systems.** "Analyze churn trends in our customer data." The agent connects to Databricks, writes and executes queries, interprets the results, pulls the churned accounts into a segmented list in HubSpot, drafts re-engagement emails, and posts the key findings to Slack.

**Content production.** "Create a campaign for our summer product launch." The agent researches competitors, generates mood boards and ad concepts, writes copy across formats, produces video and image documents, and organizes everything into a brief.

**Good to know**

- The agent adapts as it goes. If a website is down, a query returns unexpected results, or new information changes the picture, it adjusts rather than failing.

- Threads persist. You can leave and come back. The full history, all generated documents, and the computing environment are still there.

- Most document types (webpages, documents, slides, images, videos) can be downloaded or published directly from the thread.

## Agents

An agent is a fully configured, invocable worker with a clear purpose. It carries a system prompt, a set of tools and integrations, relevant skills and memories, a model selection, and cost limits per run. It can operate on its own, without you in the conversation.

There are two ways to create an agent. You can promote a thread into one: the system analyzes what the agent did, extracts the key steps, and generates a draft system prompt that captures the workflow. Or you can create one from scratch if you already know what you want it to do.

You can also set up triggers that let an agent run on its own. Deploy one to a Slack channel in passive mode and it monitors conversations, following context across messages. When it recognizes something it should handle, it acts without anyone @mentioning it. You can also set one to run on a schedule: a morning briefing that pulls overnight metrics, a weekly competitor scan. More invocation options are coming soon.

**Examples**

**Bug tracker.** An agent deployed to your #product-feedback Slack channel. When someone flags an issue in conversation, the agent structures it into fields, assigns severity, pushes it to Airtable, and confirms with a link.

**Weekly analysis.** An agent scheduled to run every Monday morning. It connects to your data warehouse, runs a set of queries, compares results to the previous week, and posts a formatted summary to Slack with callouts on anything that changed significantly.

**Meeting prep.** An agent deployed to a sales team's Slack channel. When someone mentions an upcoming account meeting, the agent pulls recent activity from Salesforce, reviews call transcripts from Gong, and drops a positioning brief into the thread before the meeting.

**Good to know**

- Agents can be scoped tightly. Give a bug-tracker agent access to Slack and Airtable only, nothing else. Choose a cost-efficient model like Sonnet for structured, predictable tasks.

- Agents improve over time. After every run, the system suggests improvements to how the agent works, and you review and accept what makes sense.

- In Slack passive mode, you define the conditions for when the agent should act, so it only responds when the conversation matches criteria you've set.

## Learnings

Learnings are how Agentis accumulates expertise. Three mechanisms (Skills, Memories, and Rubrics) capture how your work gets done, what the agent should know about your environment, and what good output looks like.

### Skills

A skill teaches the agent how to complete a specific type of work in a repeatable way. It packages instructions, documentation, and tested scripts so that any thread or agent can draw on it.

The most valuable skills capture how your team actually works: your due diligence framework, your press release methodology, how your team formats cohort retention analysis. This is the institutional knowledge that makes the difference between generic output and output that reflects real expertise. You teach the agent once, and it applies that knowledge consistently every time.

Skills can also teach the agent how to connect to and work with specific tools. Tell the agent to learn an API and it finds the documentation, identifies key endpoints, generates working scripts, tests them, and packages it all up. If a tool isn't listed in Agentis's integrations, you can often bridge the gap by teaching the agent the API as a skill.

You can build skills interactively in a thread, and the agent will guide you through what needs to be defined. Skills improve with use: every time the agent runs a skill, the system can suggest refinements that you review and accept.

**Examples**

**Process skill.** You teach the agent how your firm evaluates early-stage companies: the inflection points you look for, the founder qualities that matter, the format your partners need for Monday's meeting. Now any partner says "pull together a view on this company" and gets analysis that reflects your firm's actual thesis.

**API skill.** "Learn the SEC EDGAR API." The agent finds the documentation, maps the key endpoints, generates tested scripts for common operations, and packages it. Now any thread or agent can pull ticker data, find 10-Ks, and more without you writing integration code.

**Content methodology.** Your communications team has a specific framework for press releases: structure, tone, approval gates, distribution list. Encode that as a skill. Now an agent drafting a release follows the same methodology every time, regardless of who prompted it.

### Memories

Memories capture what the agent learns about you over time: facts, preferences, and context that persist across sessions so you don't have to repeat yourself. That your CEO goes by her first name in internal comms, that you always want cost estimates broken out by region, that your fiscal Q3 starts in August.

Memories are suggested after conversations based on what the agent picked up. You can review each suggestion and save or dismiss it, or turn on automatic saving so the agent accumulates context with every interaction. Each suggestion is categorized and rated by importance so you can quickly triage what's worth keeping.

Memories can be scoped: global (available to all threads and agents) or pinned to a specific agent.

### Rubrics

Rubrics define what a successful agent run looks like. You set evaluation criteria along with weightings for each. For a bug triage agent, that might be: did it include reproduction steps, did it assign a severity level, did it include the relevant Slack context, did it successfully log the issue in Airtable. Rubrics can be auto-generated based on an agent's purpose, then refined as you learn what matters most.

Every agent run is scored automatically against its rubric by a separate evaluator model. This gives you a view of agent performance and consistency, and when scores drop, a clear signal for what to fix — whether that's adding a skill, updating the system prompt, or adjusting tool access.

## Command Center

The Command Center is where you manage your agents once they're deployed. All your agents in one view: performance scores, cost per run, run volume, and trends over time.

When rubrics are set up, every run is scored automatically and results flow here. You can drill into any agent to see performance broken down by rubric criteria, spot which aspects of the work are strong and which need attention, and catch degradation early with alerts when scores start dropping.

The system also surfaces suggested improvements (prompt adjustments, new skills, memory additions) based on patterns it identifies across runs. You can A/B test any change against real workloads before rolling it out: swap models, adjust prompts, add or remove skills, and measure whether the change actually improves performance.

## Library

The Library collects every deliverable produced across all your threads and agent runs (webpages, images, videos, documents, data tables, and other documents) in one place. Browse, search, download, or publish anything with a shareable URL.

## Integrations

Integrations connect Agentis to the tools your team already uses: Slack, Google Drive, Airtable, Salesforce, Databricks, GitHub, and hundreds more. When you enable an integration, the agent can read from and write to that system directly within a thread or agent run. If a tool isn't listed, you can often connect it by teaching the agent the API as a skill.
