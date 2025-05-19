---
url: "https://docs.arcade.dev/toolkits/development/web/web"
title: "Arcade Docs"
---

[Integrations](https://docs.arcade.dev/toolkits "Integrations") [Developer Tools](https://docs.arcade.dev/toolkits/development/github "Developer Tools") [Web](https://docs.arcade.dev/toolkits/development/web/reference "Web") Web

# Web

**Description:** Enable agents to scrape, crawl, and map websites.

**Author:** Arcade

**Code:** [GitHub](https://github.com/ArcadeAI/arcade-ai/tree/main/toolkits/web)

**Auth:** API Key

[![PyPI Version](https://img.shields.io/pypi/v/arcade_web)](https://pypi.org/project/arcade_web/)[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/arcadeai/arcade-ai/blob/main/LICENSE)[![Python Versions](https://img.shields.io/pypi/pyversions/arcade_web)](https://pypi.org/project/arcade_web/)[![Wheel Status](https://img.shields.io/pypi/wheel/arcade_web)](https://pypi.org/project/arcade_web/)[![Downloads](https://img.shields.io/pypi/dm/arcade_web)](https://pypi.org/project/arcade_web/)

The Arcade Web toolkit provides a pre-built set of tools for interacting with websites. These tools make it easy to build agents and AI apps that can:

- Scrape web pages
- Crawl websites
- Map website structures
- Retrieve crawl status and data
- Cancel ongoing crawls

## Available Tools [Permalink for this section](https://docs.arcade.dev/toolkits/development/web/web\#available-tools)

These tools are currently available in the Arcade Web toolkit.

| Tool Name | Description |
| --- | --- |
| ScrapeUrl | Scrape a URL and return data in specified formats. |
| CrawlWebsite | Crawl a website and return crawl status and data. |
| GetCrawlStatus | Retrieve the status of a crawl job. |
| GetCrawlData | Retrieve data from a completed crawl job. |
| CancelCrawl | Cancel an ongoing crawl job. |
| MapWebsite | Map a website from a single URL to a map of the entire website. |

If you need to perform an action that’s not listed here, you can [get in touch\\
with us](mailto:contact@arcade.dev) to request a new tool, or [create your\\
own tools](https://docs.arcade.dev/home/build-tools/create-a-toolkit).

## ScrapeUrl [Permalink for this section](https://docs.arcade.dev/toolkits/development/web/web\#scrapeurl)

See Example >

Scrape a URL and return data in specified formats.

**Auth:**

- **Environment Variables Required:**
  - `FIRECRAWL_API_KEY`: Your [Firecrawl](https://www.firecrawl.dev/) API key.

**Parameters**

- **`url`** _(string, required)_ The URL to scrape.
- **`formats`** _(enum ( [Formats](https://docs.arcade.dev/toolkits/development/web/reference#formats)), optional)_ The format of the scraped web page. Defaults to `Formats.MARKDOWN`.
- **`only_main_content`** _(bool, optional)_ Only return the main content of the page. Defaults to `True`.
- **`include_tags`** _(list, optional)_ List of tags to include in the output.
- **`exclude_tags`** _(list, optional)_ List of tags to exclude from the output.
- **`wait_for`** _(int, optional)_ Delay in milliseconds before fetching content. Defaults to `10`.
- **`timeout`** _(int, optional)_ Timeout in milliseconds for the request. Defaults to `30000`.

* * *

## CrawlWebsite [Permalink for this section](https://docs.arcade.dev/toolkits/development/web/web\#crawlwebsite)

See Example >

Crawl a website and return crawl status and data.

**Auth:**

- **Environment Variables Required:**
  - `FIRECRAWL_API_KEY`: Your [Firecrawl](https://www.firecrawl.dev/) API key.

**Parameters**

- **`url`** _(string, required)_ The URL to crawl.
- **`exclude_paths`** _(list, optional)_ URL patterns to exclude from the crawl.
- **`include_paths`** _(list, optional)_ URL patterns to include in the crawl.
- **`max_depth`** _(int, required)_ Maximum depth to crawl. Defaults to `2`.
- **`ignore_sitemap`** _(bool, required)_ Ignore the website sitemap. Defaults to `True`.
- **`limit`** _(int, required)_ Limit the number of pages to crawl. Defaults to `10`.
- **`allow_backward_links`** _(bool, required)_ Enable navigation to previously linked pages. Defaults to `False`.
- **`allow_external_links`** _(bool, required)_ Allow following links to external websites. Defaults to `False`.
- **`webhook`** _(string, optional)_ URL to send a POST request when the crawl is started, updated, and completed.
- **`async_crawl`** _(bool, required)_ Run the crawl asynchronously. Defaults to `True`.

* * *

## GetCrawlStatus [Permalink for this section](https://docs.arcade.dev/toolkits/development/web/web\#getcrawlstatus)

See Example >

Retrieve the status of a crawl job.

**Auth:**

- **Environment Variables Required:**
  - `FIRECRAWL_API_KEY`: Your [Firecrawl](https://www.firecrawl.dev/) API key.

**Parameters**

- **`crawl_id`** _(string, required)_ The ID of the crawl job.

* * *

## GetCrawlData [Permalink for this section](https://docs.arcade.dev/toolkits/development/web/web\#getcrawldata)

See Example >

Retrieve data from a completed crawl job.

**Auth:**

- **Environment Variables Required:**
  - `FIRECRAWL_API_KEY`: Your [Firecrawl](https://www.firecrawl.dev/) API key.

**Parameters**

- **`crawl_id`** _(string, required)_ The ID of the crawl job.

* * *

## CancelCrawl [Permalink for this section](https://docs.arcade.dev/toolkits/development/web/web\#cancelcrawl)

See Example >

Cancel an ongoing crawl job.

**Auth:**

- **Environment Variables Required:**
  - `FIRECRAWL_API_KEY`: Your [Firecrawl](https://www.firecrawl.dev/) API key.

**Parameters**

- **`crawl_id`** _(string, required)_ The ID of the asynchronous crawl job to cancel.

* * *

## MapWebsite [Permalink for this section](https://docs.arcade.dev/toolkits/development/web/web\#mapwebsite)

See Example >

Map a website from a single URL to a map of the entire website.

**Auth:**

- **Environment Variables Required:**
  - `FIRECRAWL_API_KEY`: Your [Firecrawl](https://www.firecrawl.dev/) API key.

**Parameters**

- **`url`** _(string, required)_ The base URL to start crawling from.
- **`search`** _(string, optional)_ Search query to use for mapping.
- **`ignore_sitemap`** _(bool, required)_ Ignore the website sitemap. Defaults to `True`.
- **`include_subdomains`** _(bool, required)_ Include subdomains of the website. Defaults to `False`.
- **`limit`** _(int, required)_ Maximum number of links to return. Defaults to `5000`.

## Auth [Permalink for this section](https://docs.arcade.dev/toolkits/development/web/web\#auth)

The Arcade Web toolkit uses [Firecrawl](https://www.firecrawl.dev/) to scrape, crawl, and map websites.

**Global Environment Variables:**

- `FIRECRAWL_API_KEY`: Your [Firecrawl](https://www.firecrawl.dev/) API key.

## Get Building

[Use tools hosted on Arcade Cloud\\
\\
Arcade tools are hosted by our cloud platform and ready to be used in your agents. Learn how.](https://docs.arcade.dev/home/quickstart)

[Self Host Arcade tools\\
\\
Arcade tools can be self-hosted on your own infrastructure. Learn more about self-hosting.\\
\\
```\\
pip install arcade_web\\
```](https://docs.arcade.dev/home/install/overview)

[Reference](https://docs.arcade.dev/toolkits/development/web/reference "Reference") [Code Sandbox](https://docs.arcade.dev/toolkits/development/code-sandbox "Code Sandbox")