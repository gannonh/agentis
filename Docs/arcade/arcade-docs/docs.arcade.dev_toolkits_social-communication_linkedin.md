---
url: "https://docs.arcade.dev/toolkits/social-communication/linkedin"
title: "Arcade Docs"
---

[Integrations](https://docs.arcade.dev/toolkits "Integrations") [Social & Communication](https://docs.arcade.dev/toolkits/social-communication/twilio "Social & Communication") Linkedin

# LinkedIn

**Description:** Enable agents to interact with LinkedIn.

**Author:** Arcade

**Code:** [GitHub](https://github.com/ArcadeAI/arcade-ai/tree/main/toolkits/linkedin)

**Auth:** User authorizationvia the [LinkedIn auth provider](https://docs.arcade.dev/home/auth-providers/linkedin)

[![PyPI Version](https://img.shields.io/pypi/v/arcade_linkedin)](https://pypi.org/project/arcade_linkedin/)[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/arcadeai/arcade-ai/blob/main/LICENSE)[![Python Versions](https://img.shields.io/pypi/pyversions/arcade_linkedin)](https://pypi.org/project/arcade_linkedin/)[![Wheel Status](https://img.shields.io/pypi/wheel/arcade_linkedin)](https://pypi.org/project/arcade_linkedin/)[![Downloads](https://img.shields.io/pypi/dm/arcade_linkedin)](https://pypi.org/project/arcade_linkedin/)

The Arcade LinkedIn toolkit provides a pre-built set of tools for interacting with LinkedIn. These tools make it easy to build agents and AI apps that can:

- Create a post

## Available Tools [Permalink for this section](https://docs.arcade.dev/toolkits/social-communication/linkedin\#available-tools)

These tools are currently available in the Arcade LinkedIn toolkit.

| Tool Name | Description |
| --- | --- |
| CreateTextPost | Share a new text post to LinkedIn. |

If you need to perform an action that’s not listed here, you can [get in touch\\
with us](mailto:contact@arcade.dev) to request a new tool, or [create your\\
own tools](https://docs.arcade.dev/home/build-tools/create-a-toolkit) with the [LinkedIn auth\\
provider](https://docs.arcade.dev/home/auth-providers/linkedin#using-linkedin-auth-in-custom-tools).

## CreateTextPost [Permalink for this section](https://docs.arcade.dev/toolkits/social-communication/linkedin\#createtextpost)

See Example >

Share a new text post to LinkedIn.

**Parameters**

- **`text`** _(string, required)_ The text content of the post.

* * *

## Auth [Permalink for this section](https://docs.arcade.dev/toolkits/social-communication/linkedin\#auth)

The Arcade LinkedIn toolkit uses the [LinkedIn auth provider](https://docs.arcade.dev/home/auth-providers/linkedin) to connect to users’ LinkedIn accounts.

With the hosted Arcade Engine, there’s nothing to configure. Your users will see `Arcade` as the name of the application that’s requesting permission.

With a self-hosted installation of Arcade, you need to [configure the LinkedIn auth provider](https://docs.arcade.dev/home/auth-providers/linkedin#configuring-linkedin-auth) with your own LinkedIn app credentials.

## Get Building

[Use tools hosted on Arcade Cloud\\
\\
Arcade tools are hosted by our cloud platform and ready to be used in your agents. Learn how.](https://docs.arcade.dev/home/quickstart)

[Self Host Arcade tools\\
\\
Arcade tools can be self-hosted on your own infrastructure. Learn more about self-hosting.\\
\\
```\\
pip install arcade_linkedin\\
```](https://docs.arcade.dev/home/install/overview)

[Discord](https://docs.arcade.dev/toolkits/social-communication/discord "Discord") [Reddit](https://docs.arcade.dev/toolkits/social-communication/reddit "Reddit")