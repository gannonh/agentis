---
url: "https://docs.arcade.dev/toolkits/search/google_finance"
title: "Arcade Docs"
---

[Integrations](https://docs.arcade.dev/toolkits "Integrations") Search ToolsGoogle Finance

# Google Finance

**Description:** Empower your agents to retrieve stock data using Arcade.

**Author:** Arcade

**Code:** [GitHub](https://github.com/ArcadeAI/arcade-ai/tree/main/toolkits/search)

**Auth:** API Key

[![PyPI Version](https://img.shields.io/pypi/v/arcade_search)](https://pypi.org/project/arcade_search/)[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/arcadeai/arcade-ai/blob/main/LICENSE)[![Python Versions](https://img.shields.io/pypi/pyversions/arcade_search)](https://pypi.org/project/arcade_search/)[![Wheel Status](https://img.shields.io/pypi/wheel/arcade_search)](https://pypi.org/project/arcade_search/)[![Downloads](https://img.shields.io/pypi/dm/arcade_search)](https://pypi.org/project/arcade_search/)

The Arcade Google Finance toolkit lets you fetch real-time and historical stock data with ease. Use these tools to build intelligent agents and applications that fetch:

- Stock summary data.
- Historical stock data.

## Available Tools [Permalink for this section](https://docs.arcade.dev/toolkits/search/google_finance\#available-tools)

| Tool Name | Description |
| --- | --- |
| GetStockSummary | Retrieve current price and recent price movement of a stock. |
| GetStockHistoricalData | Fetch historical stock price and volume data for a specified time window. |

If you need an action that’s not listed here, please [contact us](mailto:contact@arcade.dev) to request a new tool, or [create your own tools](https://docs.arcade.dev/home/build-tools/create-a-toolkit).

## GetStockSummary [Permalink for this section](https://docs.arcade.dev/toolkits/search/google_finance\#getstocksummary)

Retrieve summary information for a given stock using the Google Finance API via SerpAPI. This tool returns the current price and price change from the most recent trading day.

**Parameters**

- **`ticker_symbol`** _(string, required)_: The stock ticker, e.g., ‘GOOG’.
- **`exchange_identifier`** _(string, required)_: The market identifier, e.g., ‘NASDAQ’.

See Example >

## GetStockHistoricalData [Permalink for this section](https://docs.arcade.dev/toolkits/search/google_finance\#getstockhistoricaldata)

Fetch historical data for a given stock over a defined time window. This tool returns the stock’s price and volume data along with key events when available.

**Parameters**

- **`ticker_symbol`** _(string, required)_: The stock ticker, e.g., ‘GOOG’.
- **`exchange_identifier`** _(string, required)_: The market identifier, e.g., ‘NASDAQ’ or ‘NYSE’.
- **`window`** _(enum ( [GoogleFinanceWindow](https://docs.arcade.dev/toolkits/search/reference#googlefinancewindow)), optional, defaults to ONE\_MONTH)_: Time window for the graph data.

See Example >

## Auth [Permalink for this section](https://docs.arcade.dev/toolkits/search/google_finance\#auth)

The Arcade Google Finance toolkit uses the [SerpAPI](https://serpapi.com/) to get stock data from Google Finance.

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

[Stripe](https://docs.arcade.dev/toolkits/payments/stripe "Stripe") [Google Flights](https://docs.arcade.dev/toolkits/search/google_flights "Google Flights")