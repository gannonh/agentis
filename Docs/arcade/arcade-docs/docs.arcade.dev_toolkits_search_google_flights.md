---
url: "https://docs.arcade.dev/toolkits/search/google_flights"
title: "Arcade Docs"
---

[Integrations](https://docs.arcade.dev/toolkits "Integrations") [Search Tools](https://docs.arcade.dev/toolkits/search/google_finance "Search Tools") Google Flights

# Google Flights

**Description:** Empower your agents to search for flights using Arcade.

**Author:** Arcade

**Code:** [GitHub](https://github.com/ArcadeAI/arcade-ai/tree/main/toolkits/search)

**Auth:** API Key

[![PyPI Version](https://img.shields.io/pypi/v/arcade_search)](https://pypi.org/project/arcade_search/)[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/arcadeai/arcade-ai/blob/main/LICENSE)[![Python Versions](https://img.shields.io/pypi/pyversions/arcade_search)](https://pypi.org/project/arcade_search/)[![Wheel Status](https://img.shields.io/pypi/wheel/arcade_search)](https://pypi.org/project/arcade_search/)[![Downloads](https://img.shields.io/pypi/dm/arcade_search)](https://pypi.org/project/arcade_search/)

The Arcade Google Flights toolkit lets you search for flights with ease. Use these tools to build intelligent agents and applications that:

- Search for round-trip flights.
- Search for one-way flights.

## Available Tools [Permalink for this section](https://docs.arcade.dev/toolkits/search/google_flights\#available-tools)

| Tool Name | Description |
| --- | --- |
| SearchRoundtripFlights | Retrieve roundtrip flight search results using Google Flights. |
| SearchOneWayFlights | Retrieve one-way flight search results using Google Flights. |

## SearchRoundtripFlights [Permalink for this section](https://docs.arcade.dev/toolkits/search/google_flights\#searchroundtripflights)

Retrieve flight search results using Google Flights.

**Parameters**

- **`departure_airport_code`** _(string, required)_: The departure airport code. An uppercase 3-letter code.
- **`arrival_airport_code`** _(string, required)_: The arrival airport code. An uppercase 3-letter code.
- **`outbound_date`** _(string, required)_: Flight outbound date in YYYY-MM-DD format.
- **`return_date`** _(string, optional)_: Flight return date in YYYY-MM-DD format.
- **`currency_code`** _(string, optional)_: Currency of the returned prices. Defaults to ‘USD’.
- **`travel_class`** _(enum ( [GoogleFlightsTravelClass](https://docs.arcade.dev/toolkits/search/reference#googleflightstravelclass)), optional)_: Travel class of the flight. Defaults to ‘ECONOMY’.
- **`num_adults`** _(int, optional)_: Number of adult passengers. Defaults to 1.
- **`num_children`** _(int, optional)_: Number of child passengers. Defaults to 0.
- **`max_stops`** _(enum ( [GoogleFlightsMaxStops](https://docs.arcade.dev/toolkits/search/reference#googleflightsmaxstops)), optional)_: Maximum number of stops (layovers) for the flight. Defaults to any number of stops.
- **`sort_by`** _(enum ( [GoogleFlightsSortBy](https://docs.arcade.dev/toolkits/search/reference#googleflightssortby)), optional)_: The sorting order of the results. Defaults to TOP\_FLIGHTS.

See Example >

## SearchOneWayFlights [Permalink for this section](https://docs.arcade.dev/toolkits/search/google_flights\#searchonewayflights)

Retrieve flight search results for a one-way flight using Google Flights.

**Parameters**

- **`departure_airport_code`** _(string, required)_: The departure airport code. An uppercase 3-letter code.
- **`arrival_airport_code`** _(string, required)_: The arrival airport code. An uppercase 3-letter code.
- **`outbound_date`** _(string, required)_: Flight departure date in YYYY-MM-DD format.
- **`currency_code`** _(string, optional)_: Currency of the returned prices. Defaults to ‘USD’.
- **`travel_class`** _(enum ( [GoogleFlightsTravelClass](https://docs.arcade.dev/toolkits/search/reference#googleflightstravelclass)), optional)_: Travel class of the flight. Defaults to ‘ECONOMY’.
- **`num_adults`** _(int, optional)_: Number of adult passengers. Defaults to 1.
- **`num_children`** _(int, optional)_: Number of child passengers. Defaults to 0.
- **`max_stops`** _(enum ( [GoogleFlightsMaxStops](https://docs.arcade.dev/toolkits/search/reference#googleflightsmaxstops)), optional)_: Maximum number of stops (layovers) for the flight. Defaults to any number of stops.
- **`sort_by`** _(enum ( [GoogleFlightsSortBy](https://docs.arcade.dev/toolkits/search/reference#googleflightssortby)), optional)_: The sorting order of the results. Defaults to TOP\_FLIGHTS.

See Example >

## Auth [Permalink for this section](https://docs.arcade.dev/toolkits/search/google_flights\#auth)

The Arcade Google Flights toolkit uses the [SerpAPI](https://serpapi.com/) to search for flights from Google Flights.

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

[Google Finance](https://docs.arcade.dev/toolkits/search/google_finance "Google Finance") [Google Hotels](https://docs.arcade.dev/toolkits/search/google_hotels "Google Hotels")