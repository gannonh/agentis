---
url: "https://docs.arcade.dev/toolkits/search/google_search"
title: "Arcade Docs"
---

[Integrations](https://docs.arcade.dev/toolkits "Integrations") [Search Tools](https://docs.arcade.dev/toolkits/search/google_finance "Search Tools") Google Search

# Google Search

**Description:** Enable agents to perform Google searches using SerpAPI.

**Author:** Arcade

**Code:** [GitHub](https://github.com/ArcadeAI/arcade-ai/tree/main/toolkits/search)

**Auth:** API Key

[![PyPI Version](https://img.shields.io/pypi/v/arcade_search)](https://pypi.org/project/arcade_search/)[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/arcadeai/arcade-ai/blob/main/LICENSE)[![Python Versions](https://img.shields.io/pypi/pyversions/arcade_search)](https://pypi.org/project/arcade_search/)[![Wheel Status](https://img.shields.io/pypi/wheel/arcade_search)](https://pypi.org/project/arcade_search/)[![Downloads](https://img.shields.io/pypi/dm/arcade_search)](https://pypi.org/project/arcade_search/)

The Arcade Search toolkit provides a pre-built set of tools for interacting with Google search results. These tools make it easy to build agents and AI apps that can:

- Search Google and return results.

## Available Tools [Permalink for this section](https://docs.arcade.dev/toolkits/search/google_search\#available-tools)

| Tool Name | Description |
| --- | --- |
| SearchGoogle | Search Google and return organic results. |

If you need to perform an action that’s not listed here, you can [get in touch\\
with us](mailto:contact@arcade.dev) to request a new tool, or [create your\\
own tools](https://docs.arcade.dev/home/build-tools/create-a-toolkit).

## SearchGoogle [Permalink for this section](https://docs.arcade.dev/toolkits/search/google_search\#searchgoogle)

See Example >

Search Google using SerpAPI and return organic search results.

**Parameters**

- **`query`** _(string, required)_ The search query.
- **`n_results`** _(integer, optional, Defaults to 5)_ Number of results to retrieve.

## Auth [Permalink for this section](https://docs.arcade.dev/toolkits/search/google_search\#auth)

The Arcade Google Search toolkit uses the [SerpAPI](https://serpapi.com/) to get get results from a Google search.

- **Secret:**
  - `SERP_API_KEY`: Your SerpAPI API key.

Setting the `SERP_API_KEY` secret is only required if you are [self-hosting](https://docs.arcade.dev/home/install/overview) Arcade. If you’re using Arcade Cloud, the secret is already set for you. To manage your secrets, go to the [Secrets page](https://api.arcade.dev/dashboard/auth/secrets) in the Arcade Dashboard.

## Get Building

[Use tools hosted on Arcade Cloud\\
\\
Arcade tools are hosted by our cloud platform and ready to be used in your agents. Learn how.](https://docs.arcade.dev/home/quickstart)

[Self Host Arcade tools\\
\\
Arcade tools can be self-hosted on your own infrastructure. Learn more about self-hosting.\\
\\
```\\
pip install arcade_search\\
```](https://docs.arcade.dev/home/install/overview)

[Google News](https://docs.arcade.dev/toolkits/search/google_news "Google News") [Google Shopping](https://docs.arcade.dev/toolkits/search/google_shopping "Google Shopping")