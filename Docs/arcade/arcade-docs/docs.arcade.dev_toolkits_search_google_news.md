---
url: "https://docs.arcade.dev/toolkits/search/google_news"
title: "Arcade Docs"
---

[Integrations](https://docs.arcade.dev/toolkits "Integrations") [Search Tools](https://docs.arcade.dev/toolkits/search/google_finance "Search Tools") Google News

# Google News

**Description:** Enable agents to search for news stories with Google News.

**Author:** Arcade

**Code:** [GitHub](https://github.com/ArcadeAI/arcade-ai/tree/main/toolkits/search)

**Auth:** API Key

[![PyPI Version](https://img.shields.io/pypi/v/arcade_search)](https://pypi.org/project/arcade_search/)[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/arcadeai/arcade-ai/blob/main/LICENSE)[![Python Versions](https://img.shields.io/pypi/pyversions/arcade_search)](https://pypi.org/project/arcade_search/)[![Wheel Status](https://img.shields.io/pypi/wheel/arcade_search)](https://pypi.org/project/arcade_search/)[![Downloads](https://img.shields.io/pypi/dm/arcade_search)](https://pypi.org/project/arcade_search/)

The Arcade Google News toolkit provides a pre-built set of tools for interacting with Google News. These tools make it easy to build agents and AI apps that can:

- Search for news stories with Google News.

## Available Tools [Permalink for this section](https://docs.arcade.dev/toolkits/search/google_news\#available-tools)

| Tool Name | Description |
| --- | --- |
| SearchNews | Search for news stories with Google News. |

If you need to perform an action that’s not listed here, you can [get in touch\\
with us](mailto:contact@arcade.dev) to request a new tool, or [create your\\
own tools](https://docs.arcade.dev/home/build-tools/create-a-toolkit).

## SearchNews [Permalink for this section](https://docs.arcade.dev/toolkits/search/google_news\#searchnews)

See Example >

Search for news stories with Google News.

**Parameters**

- **`query`** _(string, required)_ Keywords to search for news articles. E.g. ‘Apple launches new iPhone’.
- **`country_code`** _(string, optional, Defaults to `None`)_ 2-character country code to search for news articles. E.g. ‘us’ (United States). Defaults to `None` (search news globally).
- **`language`** _(string, optional, Defaults to ‘en’ English)_ 2-character language code to search for news articles. E.g. ‘en’ (English). Defaults to ‘en’ (English).
- **`limit`** _(int, optional, Defaults to `None`)_ Maximum number of news articles to return. Defaults to None (returns all results found by the API).

## Auth [Permalink for this section](https://docs.arcade.dev/toolkits/search/google_news\#auth)

The Arcade Google News toolkit uses the [SerpAPI](https://serpapi.com/) to get news data from Google News.

- **Secret:**
  - `SERP_API_KEY`: Your SerpAPI API key.

Setting the `SERP_API_KEY` secret is only required if you are [self-hosting](https://docs.arcade.dev/home/install/overview) Arcade. If you’re using Arcade Cloud, the secret is already set for you. To manage your secrets, go to the [Secrets page](https://api.arcade.dev/dashboard/auth/secrets) in the Arcade Dashboard.

## Default parameters [Permalink for this section](https://docs.arcade.dev/toolkits/search/google_news\#default-parameters)

Language and Country are configurable through environment variables. When set, they will be used as default for Google News tools.

Providing a different value as `language_code` or `country_code` argument in the tool call will override the default value.

**Language**

The language code is a 2-character code that determines the language in which the API will search and return news articles. There are two environment variables:

- `ARCADE_GOOGLE_LANGUAGE`: a default value for all Google search tools. If not set, defaults to ‘en’ (English).
- `ARCADE_GOOGLE_NEWS_LANGUAGE`: a default value for the news search tools. If not set, defaults to `ARCADE_GOOGLE_LANGUAGE`.

A list of supported language codes can be found [here](https://docs.arcade.dev/toolkits/search/reference#languagecodes).

**Country**

The country code is a 2-character code that determines the country in which the API will search for news articles. There are two environment variables:

- `ARCADE_GOOGLE_NEWS_COUNTRY`: a default value for the `SearchNews` tool. If not set, defaults to `None` (search news globally).

A list of supported country codes can be found [here](https://docs.arcade.dev/toolkits/search/reference#countrycodes).

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

[Google Maps](https://docs.arcade.dev/toolkits/search/google_maps "Google Maps") [Google Search](https://docs.arcade.dev/toolkits/search/google_search "Google Search")