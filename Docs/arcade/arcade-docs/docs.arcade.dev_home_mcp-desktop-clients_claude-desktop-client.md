---
url: "https://docs.arcade.dev/home/mcp-desktop-clients/claude-desktop-client"
title: "Arcade Docs"
---

[Home](https://docs.arcade.dev/home "Home") IDEs and desktop clientsUse Arcade with Claude Desktop

# Use Arcade with Claude Desktop

In this guide, you’ll learn how to connect Claude Desktop to a local Arcade server.

### Prerequisites [Permalink for this section](https://docs.arcade.dev/home/mcp-desktop-clients/claude-desktop-client\#prerequisites)

1. Create an [Arcade account](https://api.arcade.dev/signup?utm_source=docs&utm_medium=page&utm_campaign=claude-desktop-client)
2. Get an [Arcade API key](https://docs.arcade.dev/home/api-keys)
3. Install **Python 3.10** or higher

    Verify your Python version by running `python --version` or `python3 --version` in your terminal.

### Install Dependencies [Permalink for this section](https://docs.arcade.dev/home/mcp-desktop-clients/claude-desktop-client\#install-dependencies)

```nextra-code
pip install arcade-ai
pip install arcade-google
```

See [Arcade’s Integrations](https://docs.arcade.dev/toolkits) for more toolkits that can be installed.

### Set up Claude Desktop [Permalink for this section](https://docs.arcade.dev/home/mcp-desktop-clients/claude-desktop-client\#set-up-claude-desktop)

1. Download and open [Claude Desktop](https://claude.ai/download)
2. Claude Menu —> “Settings” —> “Developer” —> “Edit Config”
3. This will create a configuration file at:
   - On Mac: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - On Windows: `%APPDATA%\Claude\claude_desktop_config.json`
4. Open the configuration file and replace the file contents with this:

Replace `YOUR_ARCADE_API_KEY_HERE` with your actual Arcade API key and `/path/to/python` with the path to your Python interpreter and `/path/to/arcade` with the path to the Arcade package.

```nextra-code
{
  "mcpServers": {
    "arcade-stdio": {
      "command": "bash",
      "args": [\
        "-c",\
        "export ARCADE_API_KEY=YOUR_ARCADE_API_KEY_HERE && /path/to/python /path/to/arcade serve --mcp"\
      ]
    }
  }
}
```

5. Restart Claude Desktop. Upon restarting, you should have access to the Arcade toolkits you installed.

[Using Arcade tools](https://docs.arcade.dev/home/vercelai/use-arcade-tools "Using Arcade tools") [Use Arcade in Visual Studio Code](https://docs.arcade.dev/home/mcp-desktop-clients/vscode-client "Use Arcade in Visual Studio Code")