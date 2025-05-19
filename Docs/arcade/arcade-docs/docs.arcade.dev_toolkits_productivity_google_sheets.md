---
url: "https://docs.arcade.dev/toolkits/productivity/google/sheets"
title: "Arcade Docs"
---

[Integrations](https://docs.arcade.dev/toolkits "Integrations") Productivity & Docs [Google](https://docs.arcade.dev/toolkits/productivity/google/calendar "Google") Sheets

# Google Sheets

**Description:** Enable agents to create, read, and update spreadsheets in Google Sheets.

**Author:** Arcade

**Code:** [GitHub](https://github.com/ArcadeAI/arcade-ai/tree/main/toolkits/google)

**Auth:** User authorizationvia the [Google auth provider](https://docs.arcade.dev/home/auth-providers/google)

[![PyPI Version](https://img.shields.io/pypi/v/arcade_google)](https://pypi.org/project/arcade_google/)[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/arcadeai/arcade-ai/blob/main/LICENSE)[![Python Versions](https://img.shields.io/pypi/pyversions/arcade_google)](https://pypi.org/project/arcade_google/)[![Wheel Status](https://img.shields.io/pypi/wheel/arcade_google)](https://pypi.org/project/arcade_google/)[![Downloads](https://img.shields.io/pypi/dm/arcade_google)](https://pypi.org/project/arcade_google/)

The Arcade Google Sheets toolkit provides pre-built tools for working with spreadsheets using the Google Sheets API. Use these tools to:

- Create new spreadsheets
- Retrieve spreadsheet data
- Update cell values

## Available Tools [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/google/sheets\#available-tools)

These tools are currently available in the Arcade Sheets toolkit.

| Tool Name | Description |
| --- | --- |
| CreateSpreadsheet | Create a new spreadsheet with a title and optional data. |
| GetSpreadsheet | Retrieve spreadsheet properties and cell data for all sheets. |
| WriteToCell | Write a value to a specific cell in a spreadsheet. |

If you need to perform an action that’s not listed here, you can [get in touch\\
with us](mailto:contact@arcade.dev) to request a new tool, or [create your\\
own tools](https://docs.arcade.dev/home/build-tools/create-a-toolkit) with the [Google auth\\
provider](https://docs.arcade.dev/home/auth-providers/google#using-google-auth-in-custom-tools).

## CreateSpreadsheet [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/google/sheets\#createspreadsheet)

Create a new spreadsheet with a custom title and optional data in the first sheet.

**Parameters**

- **`title`** _(string, required, default “Untitled spreadsheet”)_: The title of the new spreadsheet.
- **`data`** _(string, optional)_: A JSON string representing a dictionary that maps row numbers to dictionaries. Each sub-dictionary maps column letters to cell values. For example, `data[23]["C"]` is the value for row 23, column C.

See Example >

## GetSpreadsheet [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/google/sheets\#getspreadsheet)

Retrieve all properties and cell data for every sheet in a spreadsheet.

**Parameters**

- **`spreadsheet_id`** _(string, required)_: The ID of the spreadsheet to retrieve.

See Example >

## WriteToCell [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/google/sheets\#writetocell)

Write a value to a specific cell in a spreadsheet.

**Parameters**

- **`spreadsheet_id`** _(string, required)_: The ID of the spreadsheet.
- **`column`** _(string, required)_: The column to write to (for example, “A”, “F”, or “AZ”).
- **`row`** _(int, required)_: The row number to write to.
- **`value`** _(string, required)_: The value to set in the specified cell.
- **`sheet_name`** _(string, optional, default “Sheet1”)_: The name of the sheet to update.

See Example >

* * *

## Auth [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/google/sheets\#auth)

The Arcade Sheets toolkit uses the [Google auth provider](https://docs.arcade.dev/home/auth-providers/google) to connect to users’ Google accounts.

With the hosted Arcade Engine, there’s nothing to configure. Your users will see `Arcade` as the name of the application that’s requesting permission.

With a self-hosted installation of Arcade, you need to [configure the Google auth provider](https://docs.arcade.dev/home/auth-providers/google#configuring-google-auth) with your own Google app credentials.

## Get Building

[Use tools hosted on Arcade Cloud\\
\\
Arcade tools are hosted by our cloud platform and ready to be used in your agents. Learn how.](https://docs.arcade.dev/home/quickstart)

[Self Host Arcade tools\\
\\
Arcade tools can be self-hosted on your own infrastructure. Learn more about self-hosting.\\
\\
```\\
pip install arcade_google\\
```](https://docs.arcade.dev/home/install/overview)

[Gmail](https://docs.arcade.dev/toolkits/productivity/google/gmail "Gmail") [Reference](https://docs.arcade.dev/toolkits/productivity/google/reference "Reference")