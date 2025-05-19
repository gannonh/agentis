---
url: "https://docs.arcade.dev/toolkits/productivity/microsoft/outlook_calendar"
title: "Arcade Docs"
---

[Integrations](https://docs.arcade.dev/toolkits "Integrations") [Productivity & Docs](https://docs.arcade.dev/toolkits/productivity/google "Productivity & Docs") MicrosoftOutlook Calendar

# Outlook Calendar

**Description:** Enable agents to create and list events in Outlook Calendar.

**Author:** Arcade

**Code:** [GitHub](https://github.com/ArcadeAI/arcade-ai/tree/main/toolkits/microsoft)

**Auth:** User authorizationvia the [Microsoft auth provider](https://docs.arcade.dev/home/auth-providers/microsoft)

[![PyPI Version](https://img.shields.io/pypi/v/arcade_microsoft)](https://pypi.org/project/arcade_microsoft/)[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/arcadeai/arcade-ai/blob/main/LICENSE)[![Python Versions](https://img.shields.io/pypi/pyversions/arcade_microsoft)](https://pypi.org/project/arcade_microsoft/)[![Wheel Status](https://img.shields.io/pypi/wheel/arcade_microsoft)](https://pypi.org/project/arcade_microsoft/)[![Downloads](https://img.shields.io/pypi/dm/arcade_microsoft)](https://pypi.org/project/arcade_microsoft/)

The Arcade Outlook Calendar toolkit provides pre-built tools for working with calendar events using the Outlook API. Use these tools to:

- Create events
- List events
- Get an event

## Available Tools [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/microsoft/outlook_calendar\#available-tools)

These tools are currently available in the Arcade Sheets toolkit.

| Tool Name | Description |
| --- | --- |
| CreateEvent | Create an event in the authenticated user's default calendar |
| GetEvent | Get an event by its ID from the user's calendar |
| ListEventsInTimeRange | ist events in the user's calendar in a specific time range |

If you need to perform an action that’s not listed here, you can [get in touch\\
with us](mailto:contact@arcade.dev) to request a new tool, or [create your\\
own tools](https://docs.arcade.dev/home/build-tools/create-a-toolkit) with the [Google auth\\
provider](https://docs.arcade.dev/home/auth-providers/google#using-google-auth-in-custom-tools).

## CreateEvent [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/microsoft/outlook_calendar\#createevent)

Create an event in the authenticated user’s default calendar.

Ignores timezone offsets provided in the start\_date\_time and end\_date\_time parameters.
Instead, uses the user’s default calendar timezone to filter events.
If the user has not set a timezone for their calendar, then the timezone will be UTC.

**Parameters**

- **`subject`** _(string, required)_: The text of the event’s subject (title) line.
- **`body`** _(string, required)_: The body of the event.
- **`start_date_time`** _(datetime, required)_: The datetime of the event’s start, represented in ISO 8601 format. Timezone offset is ignored. For example, 2025-04-25T13:00:00
- **`end_date_time`** _(datetime, required)_: The datetime of the event’s end, represented in ISO 8601 format. Timezone offset is ignored. For example, 2025-04-25T13:30:00
- **`location`** _(string, optional)_: The location of the event.
- **`attendee_emails`** _(list of strings, optional)_: The email addresses of the attendees of the event. Must be valid email addresses e.g., [username@domain.com](mailto:username@domain.com).
- **`is_online_meeting`** _(bool, optional)_: Whether the event is an online meeting. Defaults to False

See Example >

* * *

## GetEvent [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/microsoft/outlook_calendar\#getevent)

Get an event by its ID from the user’s calendar.

**Parameters**

- **`event_id`** _(string, required)_: The ID of the event to get.

See Example >

* * *

## ListEventsInTimeRange [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/microsoft/outlook_calendar\#listeventsintimerange)

List events in the user’s calendar in a specific time range.

Ignores timezone offsets provided in the start\_date\_time and end\_date\_time parameters.
Instead, uses the user’s default calendar timezone to filter events.
If the user has not set a timezone for their calendar, then the timezone will be UTC.

**Parameters**

- **`start_date_time`** (datetime, required): The start date and time of the time range, represented in ISO 8601 format. Timezone offset is ignored. For example, 2025-04-24T19:00:00
- **`end_date_time`** (datetime, required): The end date and time of the time range, represented in ISO 8601 format. Timezone offset is ignored. For example, 2025-04-24T19:30:00
- **`limit`** (int, optional): The maximum number of events to return. Max 1000. Defaults to 10.

See Example >

* * *

## Auth [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/microsoft/outlook_calendar\#auth)

The Arcade Outlook Calendar toolkit uses the [Microsoft auth provider](https://docs.arcade.dev/home/auth-providers/microsoft) to connect to users’ Microsoft accounts.

With the hosted Arcade Engine, there’s nothing to configure. Your users will see `Arcade` as the name of the application that’s requesting permission.

With a self-hosted installation of Arcade, you need to [configure the Microsoft auth provider](https://docs.arcade.dev/home/auth-providers/microsoft#configuring-microsoft-auth) with your own Microsoft app credentials.

* * *

## Get Building

[Use tools hosted on Arcade Cloud\\
\\
Arcade tools are hosted by our cloud platform and ready to be used in your agents. Learn how.](https://docs.arcade.dev/home/quickstart)

[Self Host Arcade tools\\
\\
Arcade tools can be self-hosted on your own infrastructure. Learn more about self-hosting.\\
\\
```\\
pip install arcade_microsoft\\
```](https://docs.arcade.dev/home/install/overview)

[Reference](https://docs.arcade.dev/toolkits/productivity/google/reference "Reference") [Outlook Mail](https://docs.arcade.dev/toolkits/productivity/microsoft/outlook_mail "Outlook Mail")