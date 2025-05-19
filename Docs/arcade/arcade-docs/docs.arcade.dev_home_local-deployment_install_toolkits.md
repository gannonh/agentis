---
url: "https://docs.arcade.dev/home/local-deployment/install/toolkits"
title: "Arcade Docs"
---

[Home](https://docs.arcade.dev/home "Home") Local Deployment [Install](https://docs.arcade.dev/home/local-deployment/install/overview "Install") Toolkits

# Install a tool or toolkit

## Running a Local worker [Permalink for this section](https://docs.arcade.dev/home/local-deployment/install/toolkits\#running-a-local-worker)

To run a local worker without the arcade engine, you can run the following command locally:

```nextra-code
arcade serve
```

This will check for any toolkits installed in the current python virtual environment and register them with the worker.

You can also pass in the `--host` and `--port` flags to specify the host and port to run the worker on. The default host is `127.0.0.1` and the default port is `8002`.

## PyPI Installation [Permalink for this section](https://docs.arcade.dev/home/local-deployment/install/toolkits\#pypi-installation)

All Arcade toolkits are available on PyPI. To install a toolkit, run the following in the same python virtual environment as the arcade-ai package:

```nextra-code
pip install arcade-[toolkit_name]
```

For example, to install the math toolkit, run:

```nextra-code
pip install arcade-math
```

To verify the installation, run:

```nextra-code
arcade show --local
```

which should return output similar to:

```nextra-code
┏━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━┳━━━━━━━━━┓
┃ Name         ┃ Description                  ┃ Toolkit ┃ Version ┃
┡━━━━━━━━━━━━━━╇━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╇━━━━━━━━━╇━━━━━━━━━┩
│ Math.Add     │ Add two numbers together     │  Math   │  0.1.0  │
└──────────────┴──────────────────────────────┴─────────┴─────────┘
```

These are all tools that are installed in the same python virtual environment as the arcade-ai package.

See our [Toolkits Overview page](https://docs.arcade.dev/toolkits) for all available toolkits and individual installation instructions.

## Local Package Installation [Permalink for this section](https://docs.arcade.dev/home/local-deployment/install/toolkits\#local-package-installation)

Locally built toolkits can also be installed with:

```nextra-code
pip install .
```

or

```nextra-code
pip install <wheel_name>
```

in the same python virtual environment as the arcade-ai package.

## Hosted Toolkits [Permalink for this section](https://docs.arcade.dev/home/local-deployment/install/toolkits\#hosted-toolkits)

To add a toolkit to a hosted worker such as FastAPI, you can register them in the worker itself. This allows you to explicitly define which tools should be included on a particular worker.

```nextra-code
import arcade_math

app = FastAPI()

worker_secret = os.environ.get("ARCADE_WORKER_SECRET")
worker = FastAPIWorker(app, secret=worker_secret)

worker.register_toolkit(Toolkit.from_module(arcade_math))
```

## Showing Tools From a Hosted Engine [Permalink for this section](https://docs.arcade.dev/home/local-deployment/install/toolkits\#showing-tools-from-a-hosted-engine)

To show all tools that are available on an engine, you can run

```nextra-code
arcade show -h <engine_host> -p <engine_port>
```

```nextra-code
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━┳━━━━━━━━━┓
┃ Name                                   ┃ Description                                                               ┃ Package  ┃ Version ┃
┡━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╇━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╇━━━━━━━━━━╇━━━━━━━━━┩
│ Github.CountStargazers                 │ Count the number of stargazers (stars) for a GitHub repository.           │ Github   │ 0.0.15  │
│ Github.CreateIssue                     │ Create an issue in a GitHub repository.                                   │ Github   │ 0.0.15  │
│ Github.CreateIssueComment              │ Create a comment on an issue in a GitHub repository.                      │ Github   │ 0.0.15  │
│ Github.CreateReplyForReviewComment     │ Create a reply to a review comment for a pull request.                    │ Github   │ 0.0.15  │
│ Github.CreateReviewComment             │ Create a review comment for a pull request in a GitHub repository.        │ Github   │ 0.0.15  │
│ Github.GetPullRequest                  │ Get details of a pull request in a GitHub repository.                     │ Github   │ 0.0.15  │
│ Github.GetRepository                   │ Get a repository.                                                         │ Github   │ 0.0.15  │
....
```

## Authenticated Tools [Permalink for this section](https://docs.arcade.dev/home/local-deployment/install/toolkits\#authenticated-tools)

Some Toolkits may need authentication through an API key or OAuth, which can be configured in the Arcade Engine. To see the specific configuration requirements, you can checkout our [Auth Providers](https://docs.arcade.dev/home/auth-providers).

[Docker](https://docs.arcade.dev/home/local-deployment/install/docker "Docker") [Overview](https://docs.arcade.dev/home/local-deployment/configure/overview "Overview")