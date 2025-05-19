---
url: "https://docs.arcade.dev/toolkits/search/walmart"
title: "Arcade Docs"
---

[Integrations](https://docs.arcade.dev/toolkits "Integrations") [Search Tools](https://docs.arcade.dev/toolkits/search/google_finance "Search Tools") Walmart

# Walmart Search

**Description:** Enable agents to search for products with Walmart.

**Author:** Arcade

**Code:** [GitHub](https://github.com/ArcadeAI/arcade-ai/tree/main/toolkits/search)

**Auth:** API Key

[![PyPI Version](https://img.shields.io/pypi/v/arcade_search)](https://pypi.org/project/arcade_search/)[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/arcadeai/arcade-ai/blob/main/LICENSE)[![Python Versions](https://img.shields.io/pypi/pyversions/arcade_search)](https://pypi.org/project/arcade_search/)[![Wheel Status](https://img.shields.io/pypi/wheel/arcade_search)](https://pypi.org/project/arcade_search/)[![Downloads](https://img.shields.io/pypi/dm/arcade_search)](https://pypi.org/project/arcade_search/)

The Arcade Walmart Search toolkit provides a pre-built set of tools for interacting with Walmart. These tools make it easy to build agents and AI apps that can:

- Search for products listed on Walmart stores;
- Get details about a product.

## Available Tools [Permalink for this section](https://docs.arcade.dev/toolkits/search/walmart\#available-tools)

| Tool Name | Description |
| --- | --- |
| SearchWalmartProducts | Search for products listed on Walmart stores. |
| GetWalmartProductDetails | Get details about a product listed on Walmart. |

If you need to perform an action that’s not listed here, you can [get in touch\\
with us](mailto:contact@arcade.dev) to request a new tool, or [create your\\
own tools](https://docs.arcade.dev/home/build-tools/create-a-toolkit).

## SearchWalmartProducts [Permalink for this section](https://docs.arcade.dev/toolkits/search/walmart\#searchwalmartproducts)

See Example >

Search for products listed on Walmart stores.

**Parameters**

- **keywords** _(string, required)_ Keywords to search for. E.g. ‘apple iphone’ or ‘samsung galaxy’
- **sort\_by** _(enum [WalmartSortBy](https://docs.arcade.dev/toolkits/search/reference#walmartsortby), optional, Defaults to `WalmartSortBy.RELEVANCE`)_ Sort the results by the specified criteria. Defaults to `WalmartSortBy.RELEVANCE`.
- **min\_price** _(float, optional, Defaults to `None`)_ Minimum price to filter the results.
- **max\_price** _(float, optional, Defaults to `None`)_ Maximum price to filter the results.
- **next\_day\_delivery** _(bool, optional, Defaults to `False`)_ Whether to filter the results by next day delivery. Defaults to False (returns all products, regardless of delivery status).
- **page** _(int, optional, Defaults to `1`)_ Page number to fetch. Defaults to 1 (first page of results). The maximum page value is 100.

## GetWalmartProductDetails [Permalink for this section](https://docs.arcade.dev/toolkits/search/walmart\#getwalmartproductdetails)

See Example >

Get details about a product listed on Walmart.

**Parameters**

- **item\_id** _(string, required)_ Item ID. E.g. ‘414600577’. This can be retrieved from the search results of the `SearchWalmartProducts` tool.

## Auth [Permalink for this section](https://docs.arcade.dev/toolkits/search/walmart\#auth)

The Arcade Walmart Search toolkit uses the [SerpAPI](https://serpapi.com/) to get product information from Walmart.

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

[Reference](https://docs.arcade.dev/toolkits/search/reference "Reference") [Youtube](https://docs.arcade.dev/toolkits/search/youtube "Youtube")