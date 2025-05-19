---
url: "https://docs.arcade.dev/toolkits/social-communication/zoom"
title: "Arcade Docs"
---

[Integrations](https://docs.arcade.dev/toolkits "Integrations") [Social & Communication](https://docs.arcade.dev/toolkits/social-communication/twilio "Social & Communication") Zoom

# Zoom

**Description:** Enable agents to interact with Zoom by retrieving meeting information and invitations.

**Author:** Arcade

**Code:** [GitHub](https://github.com/ArcadeAI/arcade-ai/tree/main/toolkits/zoom)

**Auth:** User authorizationvia the [Zoom auth provider](https://docs.arcade.dev/home/auth-providers/zoom)

[![PyPI Version](https://img.shields.io/pypi/v/arcade_zoom)](https://pypi.org/project/arcade_zoom/)[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/arcadeai/arcade-ai/blob/main/LICENSE)[![Python Versions](https://img.shields.io/pypi/pyversions/arcade_zoom)](https://pypi.org/project/arcade_zoom/)[![Wheel Status](https://img.shields.io/pypi/wheel/arcade_zoom)](https://pypi.org/project/arcade_zoom/)[![Downloads](https://img.shields.io/pypi/dm/arcade_zoom)](https://pypi.org/project/arcade_zoom/)

The Arcade Zoom toolkit provides tools for interacting with Zoom. With these tools, you can build agents and AI applications that can:

- List upcoming meetings
- Retrieve meeting invitation details

## Available Tools [Permalink for this section](https://docs.arcade.dev/toolkits/social-communication/zoom\#available-tools)

These tools are currently available in the Arcade Zoom toolkit.

| Tool Name | Description |
| --- | --- |
| ListUpcomingMeetings | List a Zoom user's upcoming meetings within the next 24 hours. |
| GetMeetingInvitation | Retrieve the invitation note for a specific Zoom meeting. |

If you need to perform an action that’s not listed here, you can [get in touch\\
with us](mailto:contact@arcade.dev) to request a new tool, or [create your own\\
tools](https://docs.arcade.dev/home/build-tools/create-a-toolkit) with the [Zoom auth\\
provider](https://docs.arcade.dev/home/auth-providers/zoom#using-zoom-auth-in-custom-tools).

## ListUpcomingMeetings [Permalink for this section](https://docs.arcade.dev/toolkits/social-communication/zoom\#listupcomingmeetings)

List a Zoom user’s upcoming meetings within the next 24 hours.

**Parameters**

- **`user_id`** _(string, optional)_ The user’s user ID or email address. Defaults to ‘me’ for the current user.

* * *

## GetMeetingInvitation [Permalink for this section](https://docs.arcade.dev/toolkits/social-communication/zoom\#getmeetinginvitation)

Retrieve the invitation note for a specific Zoom meeting.

**Parameters**

- **`meeting_id`** _(string, required)_ The meeting’s numeric ID (as a string).

* * *

## Auth [Permalink for this section](https://docs.arcade.dev/toolkits/social-communication/zoom\#auth)

The Arcade Zoom toolkit uses the [Zoom auth provider](https://docs.arcade.dev/home/auth-providers/zoom) to connect to users’ Zoom accounts.

With the hosted Arcade Engine, there’s nothing to configure. Your users will see `Arcade ` as the name of the application that’s requesting permission.

With a self-hosted installation of Arcade, you need to [configure the Zoom auth provider](https://docs.arcade.dev/home/auth-providers/zoom#configuring-zoom-auth) with your own Zoom app credentials.

## Get Building

[Use tools hosted on Arcade Cloud\\
\\
Arcade tools are hosted by our cloud platform and ready to be used in your agents. Learn how.](https://docs.arcade.dev/home/quickstart)

[Self Host Arcade tools\\
\\
Arcade tools can be self-hosted on your own infrastructure. Learn more about self-hosting.\\
\\
```\\
pip install arcade_zoom\\
```](https://docs.arcade.dev/home/install/overview)

[X](https://docs.arcade.dev/toolkits/social-communication/x "X") [Spotify](https://docs.arcade.dev/toolkits/entertainment/spotify "Spotify")