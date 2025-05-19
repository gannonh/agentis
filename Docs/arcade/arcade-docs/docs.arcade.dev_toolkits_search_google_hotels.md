---
url: "https://docs.arcade.dev/toolkits/search/google_hotels"
title: "Arcade Docs"
---

[Integrations](https://docs.arcade.dev/toolkits "Integrations") [Search Tools](https://docs.arcade.dev/toolkits/search/google_finance "Search Tools") Google Hotels

# Google Hotels

**Description:** Empower your agents to search for hotels using Arcade.

**Author:** Arcade

**Code:** [GitHub](https://github.com/ArcadeAI/arcade-ai/tree/main/toolkits/search)

**Auth:** API Key

[![PyPI Version](https://img.shields.io/pypi/v/arcade_search)](https://pypi.org/project/arcade_search/)[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/arcadeai/arcade-ai/blob/main/LICENSE)[![Python Versions](https://img.shields.io/pypi/pyversions/arcade_search)](https://pypi.org/project/arcade_search/)[![Wheel Status](https://img.shields.io/pypi/wheel/arcade_search)](https://pypi.org/project/arcade_search/)[![Downloads](https://img.shields.io/pypi/dm/arcade_search)](https://pypi.org/project/arcade_search/)

The Arcade Google Hotels toolkit lets you search for hotels with ease. Use this tool to build intelligent agents and applications that search for hotels worldwide.

## Available Tools [Permalink for this section](https://docs.arcade.dev/toolkits/search/google_hotels\#available-tools)

| Tool Name | Description |
| --- | --- |
| SearchHotels | Retrieve hotel search results using the Google Hotels API. |

## SearchHotels [Permalink for this section](https://docs.arcade.dev/toolkits/search/google_hotels\#searchhotels)

Retrieve hotel search results using the Google Hotels API.

**Parameters**

- **`location`** _(string, required)_: Location to search for hotels, e.g., a city name, a state, etc.
- **`check_in_date`** _(string, required)_: Check-in date in YYYY-MM-DD format.
- **`check_out_date`** _(string, required)_: Check-out date in YYYY-MM-DD format.
- **`query`** _(string, optional)_: Anything that would be used in a regular Google Hotels search.
- **`currency`** _(string, optional)_: Currency code for prices. Defaults to ‘USD’.
- **`min_price`** _(int, optional)_: Minimum price per night. Defaults to no minimum.
- **`max_price`** _(int, optional)_: Maximum price per night. Defaults to no maximum.
- **`num_adults`** _(int, optional)_: Number of adults per room. Defaults to 2.
- **`num_children`** _(int, optional)_: Number of children per room. Defaults to 0.
- **`sort_by`** _(enum ( [GoogleHotelsSortBy](https://docs.arcade.dev/toolkits/search/reference#googlehotelssortby)), optional)_: The sorting order of the results. Defaults to RELEVANCE.
- **`num_results`** _(int, optional)_: Maximum number of results to return. Defaults to 5. Max 20.

See Example >

## Auth [Permalink for this section](https://docs.arcade.dev/toolkits/search/google_hotels\#auth)

The Arcade Google Hotels toolkit uses the [SerpAPI](https://serpapi.com/) to search for hotels from Google Hotels.

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

[Google Flights](https://docs.arcade.dev/toolkits/search/google_flights "Google Flights") [Google Jobs](https://docs.arcade.dev/toolkits/search/google_jobs "Google Jobs")