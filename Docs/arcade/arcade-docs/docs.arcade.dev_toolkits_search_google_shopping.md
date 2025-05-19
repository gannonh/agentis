---
url: "https://docs.arcade.dev/toolkits/search/google_shopping"
title: "Arcade Docs"
---

[Integrations](https://docs.arcade.dev/toolkits "Integrations") [Search Tools](https://docs.arcade.dev/toolkits/search/google_finance "Search Tools") Google Shopping

# Google Shopping Search

**Description:** Enable agents to search for products with Google Shopping.

**Author:** Arcade

**Code:** [GitHub](https://github.com/ArcadeAI/arcade-ai/tree/main/toolkits/search)

**Auth:** API Key

[![PyPI Version](https://img.shields.io/pypi/v/arcade_search)](https://pypi.org/project/arcade_search/)[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/arcadeai/arcade-ai/blob/main/LICENSE)[![Python Versions](https://img.shields.io/pypi/pyversions/arcade_search)](https://pypi.org/project/arcade_search/)[![Wheel Status](https://img.shields.io/pypi/wheel/arcade_search)](https://pypi.org/project/arcade_search/)[![Downloads](https://img.shields.io/pypi/dm/arcade_search)](https://pypi.org/project/arcade_search/)

The Arcade Google Shopping Search toolkit provides a pre-built set of tools for interacting with Google Shopping. These tools make it easy to build agents and AI apps that can:

- Search for products on Google Shopping;

## Available Tools [Permalink for this section](https://docs.arcade.dev/toolkits/search/google_shopping\#available-tools)

| Tool Name | Description |
| --- | --- |
| SearchShoppingProducts | Search for products on Google Shopping. |

If you need to perform an action that’s not listed here, you can [get in touch\\
with us](mailto:contact@arcade.dev) to request a new tool, or [create your\\
own tools](https://docs.arcade.dev/home/build-tools/create-a-toolkit).

## SearchGoogleShopping [Permalink for this section](https://docs.arcade.dev/toolkits/search/google_shopping\#searchgoogleshopping)

See Example >

Search for products on Google Shopping.

**Parameters**

- **keywords** _(string, required)_ Keywords to search for. E.g. ‘apple iphone’ or ‘samsung galaxy’
- **`country_code`** _(string, optional, Defaults to ‘us’ United States)_ 2-character country code to use in the Google Shopping search. A list of supported country codes can be found [here](https://docs.arcade.dev/toolkits/search/reference#countrycodes).
- **`language_code`** _(string, optional, Defaults to ‘en’ English)_ 2-character language code to use in the Google Shopping search. A list of supported language codes can be found [here](https://docs.arcade.dev/toolkits/search/reference#languagecodes).

## Auth [Permalink for this section](https://docs.arcade.dev/toolkits/search/google_shopping\#auth)

The Arcade Google Shopping Search toolkit uses the [SerpAPI](https://serpapi.com/) to get product information from Google Shopping.

- **Secret:**
  - `SERP_API_KEY`: Your SerpAPI API key.

Setting the `SERP_API_KEY` secret is only required if you are [self-hosting](https://docs.arcade.dev/home/install/overview) Arcade. If you’re using Arcade Cloud, the secret is already set for you. To manage your secrets, go to the [Secrets page](https://api.arcade.dev/dashboard/auth/secrets) in the Arcade Dashboard.

## Default parameter values [Permalink for this section](https://docs.arcade.dev/toolkits/search/google_shopping\#default-parameter-values)

Language and Country are configurable through environment variables. When set, they will be used as default for YouTube tools.

Providing a different value as `language_code` or `country_code` argument in a tool call will override the default value set in the environment variables.

**Language**

The language code is a 2-character code that determines the language in which the API will search and return video information. There are two environment variables:

- `ARCADE_GOOGLE_LANGUAGE`: a default value for all Google Search tools. If not set, defaults to ‘en’ (English).
- `ARCADE_GOOGLE_SHOPPING_LANGUAGE`: a default value for the Google Shopping Search tools. If not set, defaults to `ARCADE_GOOGLE_LANGUAGE`.

A list of supported language codes can be found [here](https://docs.arcade.dev/toolkits/search/reference#languagecodes).

**Country**

The country code is a 2-character code that determines the country in which the API will search for videos:

- `ARCADE_GOOGLE_COUNTRY`: a default value for all Google Search tools. If not set, defaults to `None`.
- `ARCADE_GOOGLE_SHOPPING_COUNTRY`: a default value for the Google Shopping Search tools. If not set, defaults to `ARCADE_GOOGLE_COUNTRY`. If `ARCADE_GOOGLE_COUNTRY` is not set, the default country for Google Shopping tools will be `us` (United States).

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

[Google Search](https://docs.arcade.dev/toolkits/search/google_search "Google Search") [Reference](https://docs.arcade.dev/toolkits/search/reference "Reference")