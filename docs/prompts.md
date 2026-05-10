Agentis is a system for non-technical users to deploy agents. Using a graphical user
interface, users can configure and deploy various types of agents that are accessible
via integrations with Slack or our custom web interface. This is an open source project
but needs to be web-based so that we can deploy a commercial cloud-based version. We
should integrate existing open-source packages to assist in the development. For example  
these should be evaluated for potential inclusion of one or more.

<https://github.com/withastro/flue>
<https://github.com/earendil-works/pi>
<https://github.com/vercel/ai>

Flue in particular I have heard good things about and it may be a good place to start. Our initial agents on offer in fact could be theior examples:

Support Agent
A support agent can also run in a virtual sandbox, but we now add a file-system using an R2 bucket. The knowledge base is stored in R2 and mounted directly into the agent's filesystem — the agent searches it with its built-in tools (grep, glob, read). Skills are also defined in the bucket that help the agent perform its task.

Because this agent is deployed to Cloudflare, message history and session state are automatically persisted for you. So you (or your customer) can revisit this support session days, weeks, or years later and pick up exactly where you left off.

Issue Triage (CI)
A triage agent that runs in CI whenever an issue is opened on GitHub. The "local" sandbox gives the agent direct access to the host filesystem and shell — perfect for CI runners, where gh, git, and npm are already on $PATH and the runner itself is your isolation boundary.

Coding Agent (Remote Sandbox)
The examples above all run on a lightweight virtual sandbox — no container needed. But for a full coding agent, you want a real Linux environment with git, Node.js, a browser, and a cloned repo ready to go.

Daytona's declarative image builder lets you define the environment in code. The image is cached after the first build, so subsequent sessions start instantly.

Install the Daytona connector with flue add daytona | <your-agent> (e.g. claude, opencode, codex, cursor-agent). It writes a small connectors/daytona.ts adapter into your project that you import directly.

Having said that, I'm open to various solutions and think we should do extensive research to determine the best stack.
