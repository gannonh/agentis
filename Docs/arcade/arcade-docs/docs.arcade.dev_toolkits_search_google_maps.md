---
url: "https://docs.arcade.dev/toolkits/search/google_maps"
title: "Arcade Docs"
---

[Integrations](https://docs.arcade.dev/toolkits "Integrations") [Search Tools](https://docs.arcade.dev/toolkits/search/google_finance "Search Tools") Google Maps

# Google Maps

**Description:** Enable agents to get directions between two locations with Google Maps.

**Author:** Arcade

**Code:** [GitHub](https://github.com/ArcadeAI/arcade-ai/tree/main/toolkits/search)

**Auth:** API Key

[![PyPI Version](https://img.shields.io/pypi/v/arcade_search)](https://pypi.org/project/arcade_search/)[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/arcadeai/arcade-ai/blob/main/LICENSE)[![Python Versions](https://img.shields.io/pypi/pyversions/arcade_search)](https://pypi.org/project/arcade_search/)[![Wheel Status](https://img.shields.io/pypi/wheel/arcade_search)](https://pypi.org/project/arcade_search/)[![Downloads](https://img.shields.io/pypi/dm/arcade_search)](https://pypi.org/project/arcade_search/)

The Arcade Google Maps toolkit provides a pre-built set of tools for interacting with Google Maps. These tools make it easy to build agents and AI apps that can:

- Get directions to a location using an address or latitude/longitude.

## Available Tools [Permalink for this section](https://docs.arcade.dev/toolkits/search/google_maps\#available-tools)

| Tool Name | Description |
| --- | --- |
| GetDirectionsBetweenAddresses | Get directions between two addresses. |
| GetDirectionsBetweenCoordinates | Get directions between two latitude/longitude coordinates. |

If you need to perform an action that’s not listed here, you can [get in touch\\
with us](mailto:contact@arcade.dev) to request a new tool, or [create your\\
own tools](https://docs.arcade.dev/home/build-tools/create-a-toolkit).

## GetDirectionsBetweenAddresses [Permalink for this section](https://docs.arcade.dev/toolkits/search/google_maps\#getdirectionsbetweenaddresses)

See Example >

Get directions between two addresses.

**Parameters**

- **`origin_address`** _(string, required)_ The origin address. Example: ‘123 Main St, New York, NY 10001’.
- **`destination_address`** _(string, required)_ The destination address. Example: ‘456 Main St, New York, NY 10001’.
- **`language`** _(string, optional, Defaults to ‘en’ English)_ 2-character language code to use in the Google Maps search. A list of supported language codes can be found [here](https://docs.arcade.dev/toolkits/search/reference#languagecodes).
- **`country`** _(string, optional, Defaults to `None`)_ 2-character country code to use in the Google Maps search. A list of supported country codes can be found [here](https://docs.arcade.dev/toolkits/search/reference#countrycodes).
- **`distance_unit`** _(enum ( [GoogleMapsDistanceUnit](https://docs.arcade.dev/toolkits/search/reference#googlemapsdistanceunit)), optional, Defaults to `GoogleMapsDistanceUnit.KM`)_ Distance unit to use in the Google Maps search.
- **`travel_mode`** _(enum ( [GoogleMapsTravelMode](https://docs.arcade.dev/toolkits/search/reference#googlemapstravelmode)), optional, Defaults to `GoogleMapsTravelMode.BEST`)_ Travel mode to use in the Google Maps search.

## GetDirectionsBetweenCoordinates [Permalink for this section](https://docs.arcade.dev/toolkits/search/google_maps\#getdirectionsbetweencoordinates)

See Example >

Get directions between two latitude/longitude coordinates.

**Parameters**

- **`origin_latitude`** _(float, required)_ The origin latitude.
- **`origin_longitude`** _(float, required)_ The origin longitude.
- **`destination_latitude`** _(float, required)_ The destination latitude.
- **`destination_longitude`** _(float, required)_ The destination longitude.
- **`language`** _(string, optional, Defaults to ‘en’ English)_ 2-character language code to use in the Google Maps search. A list of supported language codes can be found [here](https://docs.arcade.dev/toolkits/search/reference#languagecodes).
- **`country`** _(string, optional, Defaults to `None`)_ 2-character country code to use in the Google Maps search. A list of supported country codes can be found [here](https://docs.arcade.dev/toolkits/search/reference#countrycodes).
- **`distance_unit`** _(enum ( [GoogleMapsDistanceUnit](https://docs.arcade.dev/toolkits/search/reference#googlemapsdistanceunit)), optional, Defaults to `GoogleMapsDistanceUnit.KM`)_ Distance unit to use in the Google Maps search.
- **`travel_mode`** _(enum ( [GoogleMapsTravelMode](https://docs.arcade.dev/toolkits/search/reference#googlemapstravelmode)), optional, Defaults to `GoogleMapsTravelMode.BEST`)_ Travel mode to use in the Google Maps search.

## Auth [Permalink for this section](https://docs.arcade.dev/toolkits/search/google_maps\#auth)

The Arcade Google Maps toolkit uses the [SerpAPI](https://serpapi.com/) to get directions.

- **Secret:**
  - `SERP_API_KEY`: Your SerpAPI API key.

Setting the `SERP_API_KEY` secret is only required if you are [self-hosting](https://docs.arcade.dev/home/install/overview) Arcade. If you’re using Arcade Cloud, the secret is already set for you. To manage your secrets, go to the [Secrets page](https://api.arcade.dev/dashboard/auth/secrets) in the Arcade Dashboard.

## Default parameters [Permalink for this section](https://docs.arcade.dev/toolkits/search/google_maps\#default-parameters)

Language, Country, Distance Unit, and Travel Mode are configurable through environment variables. When set, they will be used as default for Google Maps tools.

Providing a different value as `language`, `country`, `distance_unit`, or `travel_mode` argument in a tool call will override the default value.

**Language**

The language code is a 2-character code that determines the language in which the API will search and return directions. There are two environment variables:

- `ARCADE_GOOGLE_LANGUAGE`: a default value for all Google tools. If not set, defaults to ‘en’ (English).
- `ARCADE_GOOGLE_MAPS_LANGUAGE`: a default value for the Google Maps tools. If not set, defaults to `ARCADE_GOOGLE_LANGUAGE`.

A list of supported language codes can be found [here](https://docs.arcade.dev/toolkits/search/reference#languagecodes).

**Country**

The country code is a 2-character code that determines the country in which the API will search for directions:

- `ARCADE_GOOGLE_MAPS_COUNTRY`: a default value for the Google Maps tools. If not set, defaults to `None`.

A list of supported country codes can be found [here](https://docs.arcade.dev/toolkits/search/reference#countrycodes).

**Distance Unit**

The distance unit is a string that determines the unit of distance to use in the Google Maps search:

- `ARCADE_GOOGLE_MAPS_DISTANCE_UNIT`: a default value for the Google Maps tools. If not set, defaults to `GoogleMapsDistanceUnit.KM`.

A list of supported distance units can be found [here](https://docs.arcade.dev/toolkits/search/reference#googlemapsdistanceunit).

**Travel Mode**

The travel mode is a string that determines the mode of travel to use in the Google Maps search:

- `ARCADE_GOOGLE_MAPS_TRAVEL_MODE`: a default value for the Google Maps tools. If not set, defaults to `GoogleMapsTravelMode.BEST`.

A list of supported travel modes can be found [here](https://docs.arcade.dev/toolkits/search/reference#googlemapstravelmode).

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

[Google Jobs](https://docs.arcade.dev/toolkits/search/google_jobs "Google Jobs") [Google News](https://docs.arcade.dev/toolkits/search/google_news "Google News")