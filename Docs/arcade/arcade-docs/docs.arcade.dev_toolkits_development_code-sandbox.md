---
url: "https://docs.arcade.dev/toolkits/development/code-sandbox"
title: "Arcade Docs"
---

[Integrations](https://docs.arcade.dev/toolkits "Integrations") [Developer Tools](https://docs.arcade.dev/toolkits/development/github "Developer Tools") Code Sandbox

# Code Sandbox

**Description:** Enable agents to run code in a sandboxed environment.

**Author:** Arcade

**Code:** [GitHub](https://github.com/ArcadeAI/arcade-ai/tree/main/toolkits/code_sandbox)

**Auth:** API Key

[![PyPI Version](https://img.shields.io/pypi/v/arcade_code_sandbox)](https://pypi.org/project/arcade_code_sandbox/)[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/arcadeai/arcade-ai/blob/main/LICENSE)[![Python Versions](https://img.shields.io/pypi/pyversions/arcade_code_sandbox)](https://pypi.org/project/arcade_code_sandbox/)[![Wheel Status](https://img.shields.io/pypi/wheel/arcade_code_sandbox)](https://pypi.org/project/arcade_code_sandbox/)[![Downloads](https://img.shields.io/pypi/dm/arcade_code_sandbox)](https://pypi.org/project/arcade_code_sandbox/)

The Arcade Code Sandbox toolkit provides a pre-built set of tools for running code in a sandboxed environment. These tools make it easy to build agents and AI apps that can:

- Run code in a sandboxed environment
- Create a static matplotlib chart

## Available Tools [Permalink for this section](https://docs.arcade.dev/toolkits/development/code-sandbox\#available-tools)

These tools are currently available in the Arcade Code Sandbox toolkit.

| Tool Name | Description |
| --- | --- |
| RunCode | Run code in a sandboxed environment. |
| CreateStaticMatplotlibChart | Create a static matplotlib chart. |

If you need to perform an action that’s not listed here, you can [get in touch\\
with us](mailto:contact@arcade.dev) to request a new tool, or [create your\\
own tools](https://docs.arcade.dev/home/build-tools/create-a-toolkit).

## RunCode [Permalink for this section](https://docs.arcade.dev/toolkits/development/code-sandbox\#runcode)

See Example >

Run code in a sandbox and return the output.

**Auth:**

- **Environment Variables Required:**
  - `E2B_API_KEY`: Your API key for authentication.

**Parameters**

- **`code`** _(string, required)_ The code to run.
- **`language`** _(string, optional)_ The language of the code. Valid values are ‘python’, ‘js’, ‘r’, ‘java’, ‘bash’. Defaults to ‘python’.

* * *

## CreateStaticMatplotlibChart [Permalink for this section](https://docs.arcade.dev/toolkits/development/code-sandbox\#createstaticmatplotlibchart)

See Example >

Run the provided Python code to generate a static matplotlib chart. The resulting chart is returned as a base64 encoded image.

**Auth:**

- **Environment Variables Required:**
  - `E2B_API_KEY`: Your API key for authentication.

**Parameters**

- **`code`** _(string, required)_ The Python code to run.

## Auth [Permalink for this section](https://docs.arcade.dev/toolkits/development/code-sandbox\#auth)

The Arcade Code Sandbox toolkit uses [E2B](https://e2b.dev/) to run code in a sandboxed environment.

**Global Environment Variables:**

- `E2B_API_KEY`: Your [E2B](https://e2b.dev/) API key.

## Get Building

[Use tools hosted on Arcade Cloud\\
\\
Arcade tools are hosted by our cloud platform and ready to be used in your agents. Learn how.](https://docs.arcade.dev/home/quickstart)

[Self Host Arcade tools\\
\\
Arcade tools can be self-hosted on your own infrastructure. Learn more about self-hosting.\\
\\
```\\
pip install arcade-code-sandbox\\
```](https://docs.arcade.dev/home/install/overview)

[Web](https://docs.arcade.dev/toolkits/development/web/web "Web") [Stripe](https://docs.arcade.dev/toolkits/payments/stripe "Stripe")