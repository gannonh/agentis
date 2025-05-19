---
url: "https://docs.arcade.dev/toolkits/search/youtube"
title: "Arcade Docs"
---

[Integrations](https://docs.arcade.dev/toolkits "Integrations") [Search Tools](https://docs.arcade.dev/toolkits/search/google_finance "Search Tools") Youtube

# YouTube Search

**Description:** Enable agents to search for videos on YouTube.

**Author:** Arcade

**Code:** [GitHub](https://github.com/ArcadeAI/arcade-ai/tree/main/toolkits/search)

**Auth:** API Key

[![PyPI Version](https://img.shields.io/pypi/v/arcade_search)](https://pypi.org/project/arcade_search/)[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/arcadeai/arcade-ai/blob/main/LICENSE)[![Python Versions](https://img.shields.io/pypi/pyversions/arcade_search)](https://pypi.org/project/arcade_search/)[![Wheel Status](https://img.shields.io/pypi/wheel/arcade_search)](https://pypi.org/project/arcade_search/)[![Downloads](https://img.shields.io/pypi/dm/arcade_search)](https://pypi.org/project/arcade_search/)

The Arcade YouTube Search toolkit provides a pre-built set of tools for interacting with YouTube. These tools make it easy to build agents and AI apps that can:

- Search for videos on YouTube;
- Get details about a video.

## Available Tools [Permalink for this section](https://docs.arcade.dev/toolkits/search/youtube\#available-tools)

| Tool Name | Description |
| --- | --- |
| SearchYoutubeVideos | Search for videos on YouTube. |
| GetYoutubeVideoDetails | Get details about a video on YouTube. |

If you need to perform an action that’s not listed here, you can [get in touch\\
with us](mailto:contact@arcade.dev) to request a new tool, or [create your\\
own tools](https://docs.arcade.dev/home/build-tools/create-a-toolkit).

## SearchYoutubeVideos [Permalink for this section](https://docs.arcade.dev/toolkits/search/youtube\#searchyoutubevideos)

See Example >

Search for videos on YouTube.

**Parameters**

- **keywords** _(string, required)_ Keywords to search for. E.g. ‘apple iphone’ or ‘samsung galaxy’
- **`language_code`** _(string, optional, Defaults to ‘en’ English)_ 2-character language code to use in the YouTube search. A list of supported language codes can be found [here](https://docs.arcade.dev/toolkits/search/reference#languagecodes).
- **`country_code`** _(string, optional, Defaults to ‘us’ United States)_ 2-character country code to use in the YouTube search. A list of supported country codes can be found [here](https://docs.arcade.dev/toolkits/search/reference#countrycodes).
- **`next_page_token`** _(string, optional, Defaults to ‘None’)_ The next page token to use for pagination. Defaults to `None` (start from the first page).

## GetYoutubeVideoDetails [Permalink for this section](https://docs.arcade.dev/toolkits/search/youtube\#getyoutubevideodetails)

See Example >

Get details about a video on YouTube.

**Parameters**

- **video\_id** _(string, required)_ Video ID. E.g. ‘414600577’. This can be retrieved from the search results of the `SearchYoutubeVideos` tool.
- **`language_code`** _(string, optional, Defaults to ‘en’ English)_ 2-character language code to return information about the video. A list of supported language codes can be found [here](https://docs.arcade.dev/toolkits/search/reference#languagecodes).
- **`country_code`** _(string, optional, Defaults to ‘us’ United States)_ 2-character country code to return information about the video. A list of supported country codes can be found [here](https://docs.arcade.dev/toolkits/search/reference#countrycodes).

## Auth [Permalink for this section](https://docs.arcade.dev/toolkits/search/youtube\#auth)

The Arcade YouTube Search toolkit uses the [SerpAPI](https://serpapi.com/) to get video information from YouTube.

- **Secret:**
  - `SERP_API_KEY`: Your SerpAPI API key.

Setting the `SERP_API_KEY` secret is only required if you are [self-hosting](https://docs.arcade.dev/home/install/overview) Arcade. If you’re using Arcade Cloud, the secret is already set for you. To manage your secrets, go to the [Secrets page](https://api.arcade.dev/dashboard/auth/secrets) in the Arcade Dashboard.

## Default parameter values [Permalink for this section](https://docs.arcade.dev/toolkits/search/youtube\#default-parameter-values)

Language and Country are configurable through environment variables. When set, they will be used as default for YouTube tools.

Providing a different value as `language_code` or `country_code` argument in a tool call will override the default value set in the environment variables.

**Language**

The language code is a 2-character code that determines the language in which the API will search and return video information. There are two environment variables:

- `ARCADE_GOOGLE_LANGUAGE`: a default value for all Google Search tools. If not set, defaults to ‘en’ (English).
- `ARCADE_YOUTUBE_SEARCH_LANGUAGE`: a default value for the YouTube Search tools. If not set, defaults to `ARCADE_GOOGLE_LANGUAGE`.

A list of supported language codes can be found [here](https://docs.arcade.dev/toolkits/search/reference#languagecodes).

**Country**

The country code is a 2-character code that determines the country in which the API will search for videos:

- `ARCADE_GOOGLE_COUNTRY`: a default value for all Google Search tools. If not set, defaults to `None`.
- `ARCADE_YOUTUBE_SEARCH_COUNTRY`: a default value for the YouTube Search tools. If not set, defaults to `ARCADE_GOOGLE_COUNTRY`. If `ARCADE_GOOGLE_COUNTRY` is not set, the default country for YouTube tools will be `us` (United States).

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

[Walmart](https://docs.arcade.dev/toolkits/search/walmart "Walmart") [Hubspot](https://docs.arcade.dev/toolkits/sales/hubspot "Hubspot")