---
url: "https://docs.arcade.dev/toolkits/search/google_jobs"
title: "Arcade Docs"
---

[Integrations](https://docs.arcade.dev/toolkits "Integrations") [Search Tools](https://docs.arcade.dev/toolkits/search/google_finance "Search Tools") Google Jobs

# Google Jobs

**Description:** Enable agents to search for job openings with Google Jobs.

**Author:** Arcade

**Code:** [GitHub](https://github.com/ArcadeAI/arcade-ai/tree/main/toolkits/search)

**Auth:** API Key

[![PyPI Version](https://img.shields.io/pypi/v/arcade_search)](https://pypi.org/project/arcade_search/)[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/arcadeai/arcade-ai/blob/main/LICENSE)[![Python Versions](https://img.shields.io/pypi/pyversions/arcade_search)](https://pypi.org/project/arcade_search/)[![Wheel Status](https://img.shields.io/pypi/wheel/arcade_search)](https://pypi.org/project/arcade_search/)[![Downloads](https://img.shields.io/pypi/dm/arcade_search)](https://pypi.org/project/arcade_search/)

The Arcade Google Jobs toolkit provides a pre-built set of tools for interacting with Google Jobs. These tools make it easy to build agents and AI apps that can:

- Search for job openings with Google Jobs.

## Available Tools [Permalink for this section](https://docs.arcade.dev/toolkits/search/google_jobs\#available-tools)

| Tool Name | Description |
| --- | --- |
| SearchJobs | Search for job openings with Google Jobs. |

If you need to perform an action that’s not listed here, you can [get in touch\\
with us](mailto:contact@arcade.dev) to request a new tool, or [create your\\
own tools](https://docs.arcade.dev/home/build-tools/create-a-toolkit).

## SearchJobs [Permalink for this section](https://docs.arcade.dev/toolkits/search/google_jobs\#searchjobs)

See Example >

Search for job openings with Google Jobs.

**Parameters**

- **`query`** _(string, required)_ Search query. Provide a job title, company name, and/or any keywords in general representing what kind of jobs the user is looking for.
- **`location`** _(string, optional, Defaults to `None`)_ Location to search for jobs. E.g. ‘United States’ or ‘New York, NY’. Defaults to None.
- **`language`** _(string, optional, Defaults to ‘en’ English)_ 2-character language code to use in the Google Jobs search.
- **`limit`** _(int, optional, Defaults to 10)_ Maximum number of results to retrieve. Defaults to 10 (max supported by the API).
- **`next_page_token`** _(string, optional, Defaults to `None`)_ Next page token to paginate results. Defaults to None (start from the first page).

## Auth [Permalink for this section](https://docs.arcade.dev/toolkits/search/google_jobs\#auth)

The Arcade Google Jobs toolkit uses the [SerpAPI](https://serpapi.com/) to get job data from Google Jobs.

- **Secret:**
  - `SERP_API_KEY`: Your SerpAPI API key.

Setting the `SERP_API_KEY` secret is only required if you are [self-hosting](https://docs.arcade.dev/home/install/overview) Arcade. If you’re using Arcade Cloud, the secret is already set for you. To manage your secrets, go to the [Secrets page](https://api.arcade.dev/dashboard/auth/secrets) in the Arcade Dashboard.

## Default parameters [Permalink for this section](https://docs.arcade.dev/toolkits/search/google_jobs\#default-parameters)

Language is configurable through environment variables. When set, they will be used as default for Google Jobs tools.

Providing a different value as `language` argument in a tool call will override the default value.

**Language**

The language code is a 2-character code that determines the language in which the API will search and return news articles. There are two environment variables:

- `ARCADE_GOOGLE_LANGUAGE`: a default value for all Google search tools. If not set, defaults to ‘en’ (English).
- `ARCADE_GOOGLE_JOBS_LANGUAGE`: a default value for the jobs search tools. If not set, defaults to `ARCADE_GOOGLE_LANGUAGE`.

A list of supported language codes can be found [here](https://docs.arcade.dev/toolkits/search/reference#languagecodes).

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

[Google Hotels](https://docs.arcade.dev/toolkits/search/google_hotels "Google Hotels") [Google Maps](https://docs.arcade.dev/toolkits/search/google_maps "Google Maps")