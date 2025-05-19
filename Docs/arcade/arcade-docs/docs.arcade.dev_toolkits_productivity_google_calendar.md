---
url: "https://docs.arcade.dev/toolkits/productivity/google/calendar"
title: "Arcade Docs"
---

[Integrations](https://docs.arcade.dev/toolkits "Integrations") Productivity & DocsGoogleCalendar

# Calendar

**Description:** Enable agents to interact with Google Calendar events.

**Author:** Arcade

**Code:** [GitHub](https://github.com/ArcadeAI/arcade-ai/tree/main/toolkits/google)

**Auth:** User authorizationvia the [Google auth provider](https://docs.arcade.dev/home/auth-providers/google)

[![PyPI Version](https://img.shields.io/pypi/v/arcade_google)](https://pypi.org/project/arcade_google/)[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/arcadeai/arcade-ai/blob/main/LICENSE)[![Python Versions](https://img.shields.io/pypi/pyversions/arcade_google)](https://pypi.org/project/arcade_google/)[![Wheel Status](https://img.shields.io/pypi/wheel/arcade_google)](https://pypi.org/project/arcade_google/)[![Downloads](https://img.shields.io/pypi/dm/arcade_google)](https://pypi.org/project/arcade_google/)

The Arcade Calendar toolkit provides a pre-built set of tools for interacting with Google Calendar. These tools make it easy to build agents and AI apps that can:

- Create, update, list, and delete events

## Available Tools [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/google/calendar\#available-tools)

These tools are currently available in the Arcade Calendar toolkit.

| Tool Name | Description |
| --- | --- |
| ListCalendars | List the calendars that the user can see. |
| CreateEvent | Create a new event in Google Calendar. |
| ListEvents | List events from Google Calendar. |
| UpdateEvent | Update an existing event in Google Calendar. |
| DeleteEvent | Delete an event from Google Calendar. |
| FindTimeSlotsWhenEveryoneIsFree | Provides time slots when everyone is free within a given date range and time boundaries. |

If you need to perform an action that’s not listed here, you can [get in touch\\
with us](mailto:contact@arcade.dev) to request a new tool, or [create your\\
own tools](https://docs.arcade.dev/home/build-tools/create-a-toolkit) with the [Google auth\\
provider](https://docs.arcade.dev/home/auth-providers/google#using-google-auth-in-custom-tools).

## ListCalendars [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/google/calendar\#listcalendars)

See Example >

List the calendars that the user can access.

**Parameters**

- **`max_results`** _(int, optional)_ The maximum number of calendars to return. Up to 250 calendars, defaults to 10.
- **`show_deleted`** _(boolean, optional)_ Whether to show deleted calendars. Defaults to False.
- **`show_hidden`** _(boolean, optional)_ Whether to show hidden calendars. Defaults to False.
- **`next_page_token`** _(string, optional)_ The token to retrieve the next page of calendars. Optional.

* * *

## CreateEvent [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/google/calendar\#createevent)

See Example >

Create a new event in the specified calendar.

**Parameters**

- **`summary`** _(string, required)_ The title of the event
- **`start_datetime`** _(string, required)_ The datetime when the event starts in ISO 8601 format, e.g., ‘2024-12-31T15:30:00’.
- **`end_datetime`** _(string, required)_ The datetime when the event ends in ISO 8601 format, e.g., ‘2024-12-31T17:30:00’.
- **`calendar_id`** _(string, optional, Defaults to `'primary'`)_ The ID of the calendar to create the event in, usually ‘primary’.
- **`description`** _(string, optional)_ The description of the event
- **`location`** _(string, optional)_ The location of the event
- **`visibility`** _(string, optional)_ The visibility of the event
- **`attendee_emails`** _(array, optional)_ The list of attendee emails. Must be valid email addresses e.g., `username@domain.com`.

* * *

## ListEvents [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/google/calendar\#listevents)

See Example >

List events from the specified calendar within the given datetime range.

min\_end\_datetime serves as the lower bound (exclusive) for an event’s end time. max\_start\_datetime serves as the upper bound (exclusive) for an event’s start time.

For example: If min\_end\_datetime is set to 2024-09-15T09:00:00 and max\_start\_datetime is set to 2024-09-16T17:00:00, the function will return events that:

1. End after 09:00 on September 15, 2024 (exclusive)
2. Start before 17:00 on September 16, 2024 (exclusive) This means an event starting at 08:00 on September 15 and ending at 10:00 on September 15 would be included, but an event starting at 17:00 on September 16 would not be included.

**Parameters**

- **`min_end_datetime`** _(string, required)_ Filter by events that end on or after this datetime in ISO 8601 format, e.g., ‘2024-09-15T09:00:00’.
- **`max_start_datetime`** _(string, required)_ Filter by events that start before this datetime in ISO 8601 format, e.g., ‘2024-09-16T17:00:00’.
- **`calendar_id`** _(string, optional)_ The ID of the calendar to list events from
- **`max_results`** _(integer, optional)_ The maximum number of events to return

* * *

## UpdateEvent [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/google/calendar\#updateevent)

See Example >

Update an existing event in the specified calendar with the provided details. Only the provided fields will be updated; others will remain unchanged.

`updated_start_datetime` and `updated_end_datetime` are independent and can be provided separately.

**Parameters**

- **`event_id`** _(string, required)_ The ID of the event to update
- **`updated_start_datetime`** _(string, optional)_ The updated datetime that the event starts in ISO 8601 format, e.g., ‘2024-12-31T15:30:00’.
- **`updated_end_datetime`** _(string, optional)_ The updated datetime that the event ends in ISO 8601 format, e.g., ‘2024-12-31T17:30:00’.
- **`updated_calendar_id`** _(string, optional)_ The updated ID of the calendar containing the event.
- **`updated_summary`** _(string, optional)_ The updated title of the event
- **`updated_description`** _(string, optional)_ The updated description of the event
- **`updated_location`** _(string, optional)_ The updated location of the event
- **`updated_visibility`** _(enum ( [EventVisibility](https://docs.arcade.dev/toolkits/productivity/google/reference#eventvisibility)), optional)_ The visibility of the event
- **`attendee_emails_to_add`** _(array, optional)_ The list of attendee emails to add. Must be valid email addresses e.g., `username@domain.com`.
- **`attendee_emails_to_remove`** _(array, optional)_ The list of attendee emails to remove. Must be valid email addresses e.g., `username@domain.com`.
- **`send_updates`** _(enum ( [SendUpdatesOptions](https://docs.arcade.dev/toolkits/productivity/google/reference#sendupdatesoptions)), optional, Defaults to `'all'`)_ Should attendees be notified of the update? (none, all, external\_only)

* * *

## DeleteEvent [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/google/calendar\#deleteevent)

See Example >

Delete an event from Google Calendar.

**Parameters**

- **`event_id`** _(string, required)_ The ID of the event to delete
- **`calendar_id`** _(string, optional, Defaults to `'primary'`)_ The ID of the calendar containing the event
- **`send_updates`** _(enum ( [SendUpdatesOptions](https://docs.arcade.dev/toolkits/productivity/google/reference#sendupdatesoptions)), optional, Defaults to `'all'`)_ Specifies which attendees to notify about the deletion

## FindTimeSlotsWhenEveryoneIsFree [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/google/calendar\#findtimeslotswheneveryoneisfree)

See Example >

Provides time slots when everyone is free within a given date range and time boundaries.

**Parameters**

- **`email_addresses`** _(list of strings, defaults to `None`)_ The list of email addresses from people in the same organization domain (apart from the currently logged in user) to search for free time slots. Defaults to None, which will return free time slots for the current user only.
- **`start_date`** _(string, optional, Defaults to `None`)_ The start date to search for time slots in the format ‘YYYY-MM-DD’. Defaults to today’s date. It will search starting from this date at the time 00:00:00.
- **`end_date`** _(string, optional, Defaults to `None`)_ The end date to search for time slots in the format ‘YYYY-MM-DD’. Defaults to seven days from the start date. It will search until this date at the time 23:59:59.
- **`start_time_boundary`** _(string, defaults to “08:00”)_ Will return free slots in any given day starting from this time in the format ‘HH:MM’. Defaults to ‘08:00’, which is a usual business hour start time.
- **`end_time_boundary`** _(string, defaults to “18:00”)_ Will return free slots in any given day ending at this time in the format ‘HH:MM’. Defaults to ‘18:00’, which is a usual business hour end time.

* * *

## Auth [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/google/calendar\#auth)

The Arcade Calendar toolkit uses the [Google auth provider](https://docs.arcade.dev/home/auth-providers/google) to connect to users’ Google accounts.

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

[Overview](https://docs.arcade.dev/toolkits "Overview") [Contacts](https://docs.arcade.dev/toolkits/productivity/google/contacts "Contacts")