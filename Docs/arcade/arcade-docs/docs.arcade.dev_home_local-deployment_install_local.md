---
url: "https://docs.arcade.dev/home/local-deployment/install/local"
title: "Arcade Docs"
---

[Home](https://docs.arcade.dev/home "Home") Local Deployment [Install](https://docs.arcade.dev/home/local-deployment/install/overview "Install") Local

# Installing Arcade Locally

This guide will help you install Arcade and set up your development environment. If you are developing tools to use with Arcade, this guide will provide you with a complete local deployment of Arcade for developing and testing tools.

## Prerequisites [Permalink for this section](https://docs.arcade.dev/home/local-deployment/install/local\#prerequisites)

Before you begin, make sure you have the following:

- **Python 3.10 or higher**
- **pip**: The Python package installer should be available. It’s typically included with Python.
- **Arcade Account**: Sign up for an [Arcade account](https://api.arcade.dev/signup?utm_source=docs&utm_medium=page&utm_campaign=local-install) if you haven’t already.
- **Package Manager**: Either Brew (macOS) or Apt (linux) to install the engine binary.

Verify your Python version by running `python --version` or `python3 --version` in your terminal.

## Installation [Permalink for this section](https://docs.arcade.dev/home/local-deployment/install/local\#installation)

### Install the Client [Permalink for this section](https://docs.arcade.dev/home/local-deployment/install/local\#install-the-client)

To connect to the cloud or local Arcade Engine, we need to install the Arcade SDK and CLI from the `arcade-ai` package.

```nextra-code
pip install 'arcade-ai[evals]'
arcade login
```

For a simple example on using the Arcade CLI, see the [quickstart on building tools](https://docs.arcade.dev/home/custom-tools)

### Install the Engine [Permalink for this section](https://docs.arcade.dev/home/local-deployment/install/local\#install-the-engine)

To run the Arcade Engine locally, you’ll need to install `arcade-engine`. Choose the installation method that matches your operating system.

This will install a template engine configuration.

macOS (Homebrew)Ubuntu/Debian (APT)Windows (coming soon)

```nextra-code
brew install ArcadeAI/tap/arcade-engine
```

```nextra-code
wget -qO - https://deb.arcade.dev/public-key.asc | sudo apt-key add -
echo "deb https://deb.arcade.dev/ubuntu stable main" | sudo tee /etc/apt/sources.list.d/arcade-ai.list
sudo apt update
sudo apt install arcade-engine
```

```nextra-code
Windows support is coming soon!
```

Want to see Windows support sooner? Show your interest by adding a 👍 to [this GitHub issue](https://github.com/ArcadeAI/arcade-ai/issues/258).

### Install a toolkit [Permalink for this section](https://docs.arcade.dev/home/local-deployment/install/local\#install-a-toolkit)

In order to run the Arcade worker, you’ll need to install at least one tool. For local development, you can just `pip install` a tool in the same environment as the client.

```nextra-code
pip install arcade-math
```

For more information on installing toolkits, see the [Toolkit Installation](https://docs.arcade.dev/home/install/toolkits) page.

To see all available toolkits, view the [Toolkits Page](https://docs.arcade.dev/toolkits).

### Set OpenAI API key [Permalink for this section](https://docs.arcade.dev/home/local-deployment/install/local\#set-openai-api-key)

Before starting the Engine, we need to set an OpenAI API Key that the Engine can use to connect to OpenAI.

Edit the `engine.env` file to set the `OPENAI_API_KEY` environment variable:

```nextra-code
OPENAI_API_KEY="<your_openai_api_key>"
```

See the [configuration overview](https://docs.arcade.dev/home/configure/overview) for more information on how to configure Arcade Engine and how to locate the `engine.env` file.

### Start the Engine and worker [Permalink for this section](https://docs.arcade.dev/home/local-deployment/install/local\#start-the-engine-and-worker)

To run both the engine and a local worker, use:

```nextra-code
arcade dev
```

The Engine and worker should both be running locally now.

To run the Engine on it’s own, you can run:

```nextra-code
arcade-engine
```

Note that the Engine requires at least one Arcade worker to run. `arcade dev` starts both the Engine and a worker automatically.

### Connect [Permalink for this section](https://docs.arcade.dev/home/local-deployment/install/local\#connect)

To chat with the running Engine, in a separate terminal instance, run:

```nextra-code
arcade chat -h localhost
```

You are now chatting with Arcade locally! To see an example of chatting, view the [quickstart](https://docs.arcade.dev/home/custom-tools).

## Next Steps [Permalink for this section](https://docs.arcade.dev/home/local-deployment/install/local\#next-steps)

- **Building Tools**: Learn how to build tools with your local Arcade Instance in the [Creating a Toolkit](https://docs.arcade.dev/home/build-tools/create-a-toolkit) guide.
- **Hosting With Docker**: Learn how to run the [Engine in Docker](https://docs.arcade.dev/home/install/docker).

## Troubleshooting [Permalink for this section](https://docs.arcade.dev/home/local-deployment/install/local\#troubleshooting)

### Engine Binary Not Found [Permalink for this section](https://docs.arcade.dev/home/local-deployment/install/local\#engine-binary-not-found)

```nextra-code
❌ Engine binary not found
```

or

```nextra-code
command not found: arcade-engine
```

This means that the Arcade Engine cannot be found in your path. Brew and Apt will automatically add the binary to you path.

Check that the binary has been properly installed (These are the common installation locations):

**Brew**

```nextra-code
ls $HOMEBREW_REPOSITORY/Cellar/arcade-engine/<version>/bin/arcade-engine
```

**Apt**

```nextra-code
ls /usr/bin/arcade-engine
```

If the binary is found, add it to your path with:

```nextra-code
export PATH=$PATH:/path/to/your/binary
```

### Toolkits Not Found [Permalink for this section](https://docs.arcade.dev/home/local-deployment/install/local\#toolkits-not-found)

```nextra-code
No toolkits found in Python environment. Exiting...
```

This means that there are no toolkits found in the same environment as the Arcade SDK. Ensure that you are installing the toolkit package in the same environment and see the [Toolkit Installation Guide](https://docs.arcade.dev/home/install/toolkits) for more details.

### Engine Config Not Found [Permalink for this section](https://docs.arcade.dev/home/local-deployment/install/local\#engine-config-not-found)

```nextra-code
❌ Config file 'engine.yaml' not found in any of the default locations.
```

or

```nextra-code
Arcade Engine has finished with error: unable to read config file $HOME/.arcade/engine.yaml: open $HOME/.arcade/engine.yaml: no such file or directory
```

`arcade dev` will search for the engine config in known directories including:

- $HOME/.arcade/engine.yaml
- $HOMEBREW\_REPOSITORY/etc/arcade-engine/engine.yaml (Homebrew)
- /etc/arcade-ai/engine.yaml (Apt)

The engine config will be downloaded by and added to one of these locations when installing the engine.

When running the engine without `arcade dev`, the config needs to be in the `$HOME/.arcade/` directory or explicitly located with `arcade-engine -c /path/to/engine.yaml`

If you cannot find your engine config, you can save and use the [Configuration Templates](https://docs.arcade.dev/home/configure/templates).

* * *

[Overview](https://docs.arcade.dev/home/local-deployment/install/overview "Overview") [Docker](https://docs.arcade.dev/home/local-deployment/install/docker "Docker")