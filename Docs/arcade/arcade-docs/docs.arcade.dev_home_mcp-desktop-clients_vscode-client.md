---
url: "https://docs.arcade.dev/home/mcp-desktop-clients/vscode-client"
title: "Arcade Docs"
---

[Home](https://docs.arcade.dev/home "Home") [IDEs and desktop clients](https://docs.arcade.dev/home/mcp-desktop-clients/claude-desktop-client "IDEs and desktop clients") Use Arcade in Visual Studio Code

# Use Arcade in Visual Studio Code

In this guide, you’ll learn how to connect Visual Studio Code to Arcade.dev’s MCP server.

As of version 1.100.0, Visual Studio Code does not yet support [MCP authorization](https://modelcontextprotocol.io/specification/draft/basic/authorization). Only tools that do not require auth, such as math and [search](https://docs.arcade.dev/toolkits/search/google_search) tools, will work with Visual Studio Code. We’re working to improve this - stay tuned!

### Set up Visual Studio Code [Permalink for this section](https://docs.arcade.dev/home/mcp-desktop-clients/vscode-client\#set-up-visual-studio-code)

1. Download and open [Visual Studio Code](https://code.visualstudio.com/download) (version 1.100.0 or higher)

2. Open the command palette and select **MCP: Add Server…**

3. Choose **HTTP**

4. Paste the following URL: `https://api.arcade.dev/v1/mcps/ms_0ujssxh0cECutqzMgbtXSGnjorm/mcp`











This URL is Arcade’s public beta MCP server. We’d love to [hear your feedback](https://docs.arcade.dev/home/contact-us)!
Coming soon: deploy a server with your own tools.

5. Give your MCP server a name, like `mcp-arcade-dev`


Visual Studio Code will update your `settings.json` file with the following:

```nextra-code
    "mcp": {
        "servers": {
            "mcp-arcade-dev": {
                "url": "https://api.arcade.dev/v1/mcps/ms_0ujssxh0cECutqzMgbtXSGnjorm/mcp"
            }
        }
    },
```

### Try it out [Permalink for this section](https://docs.arcade.dev/home/mcp-desktop-clients/vscode-client\#try-it-out)

1. Open the chat pane (typically Cmd-Shift-I or Ctrl-Shift-I)
2. Make sure you are in **Agent** mode
3. Click the 🛠️ Tools button, which opens a panel of available tools
4. Click to select the tools you want to use, and type your request in the chat pane!

![Visual Studio Code tools panel](https://docs.arcade.dev/videos/vscode_mcp_demo.webp)

[Use Arcade with Claude Desktop](https://docs.arcade.dev/home/mcp-desktop-clients/claude-desktop-client "Use Arcade with Claude Desktop") [Introduction](https://docs.arcade.dev/home/use-tools/tools-overview "Introduction")