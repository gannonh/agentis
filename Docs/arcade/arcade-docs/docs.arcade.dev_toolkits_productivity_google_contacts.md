---
url: "https://docs.arcade.dev/toolkits/productivity/google/contacts"
title: "Arcade Docs"
---

[Integrations](https://docs.arcade.dev/toolkits "Integrations") Productivity & Docs [Google](https://docs.arcade.dev/toolkits/productivity/google/calendar "Google") Contacts

# Calendar

**Description:** Enable agents to interact with Google Contacts.

**Author:** Arcade

**Code:** [GitHub](https://github.com/ArcadeAI/arcade-ai/tree/main/toolkits/google)

**Auth:** User authorizationvia the [Google auth provider](https://docs.arcade.dev/home/auth-providers/google)

[![PyPI Version](https://img.shields.io/pypi/v/arcade_google)](https://pypi.org/project/arcade_google/)[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/arcadeai/arcade-ai/blob/main/LICENSE)[![Python Versions](https://img.shields.io/pypi/pyversions/arcade_google)](https://pypi.org/project/arcade_google/)[![Wheel Status](https://img.shields.io/pypi/wheel/arcade_google)](https://pypi.org/project/arcade_google/)[![Downloads](https://img.shields.io/pypi/dm/arcade_google)](https://pypi.org/project/arcade_google/)

The Arcade Contacts toolkit provides a pre-built set of tools for interacting with Google Contacts. These tools make it easy to build agents and AI apps that can:

- Create new contacts
- Search for contacts by name or email

## Available Tools [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/google/contacts\#available-tools)

These tools are currently available in the Arcade Contacts toolkit.

| Tool Name | Description |
| --- | --- |
| SearchContactsByEmail | Search the user's contacts in Google Contacts by email address. |
| SearchContactsByName | Search the user's contacts in Google Contacts by name. |
| CreateContact | Create a new contact record in Google Contacts. |

If you need to perform an action that’s not listed here, you can [get in touch\\
with us](mailto:contact@arcade.dev) to request a new tool, or [create your\\
own tools](https://docs.arcade.dev/home/build-tools/create-a-toolkit) with the [Google auth\\
provider](https://docs.arcade.dev/home/auth-providers/google#using-google-auth-in-custom-tools).

## SearchContactsByEmail [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/google/contacts\#searchcontactsbyemail)

Search the user’s contacts in Google Contacts by email address.

See Example >

**Parameters**

- **`email`** _(string, required)_: The email address to search for.
- **`limit`** _(integer, optional)_: The maximum number of contacts to return (30 is the max allowed by the Google API).

* * *

## SearchContactsByName [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/google/contacts\#searchcontactsbyname)

Search the user’s contacts in Google Contacts by name.

See Example >

**Parameters**

- **`name`** _(string, required)_: The full name to search for.
- **`limit`** _(integer, optional)_: The maximum number of contacts to return (30 is the max allowed by the Google API).

* * *

## CreateContact [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/google/contacts\#createcontact)

Create a new contact record in Google Contacts.

See Example >

**Parameters**

- **`given_name`** _(string, required)_: The given name of the contact.
- **`family_name`** _(string, optional)_: The optional family name of the contact.
- **`email`** _(string, optional)_: The optional email address of the contact.

* * *

## Auth [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/google/contacts\#auth)

The Arcade Contacts toolkit uses the [Google auth provider](https://docs.arcade.dev/home/auth-providers/google) to connect to users’ Google accounts.

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

[Calendar](https://docs.arcade.dev/toolkits/productivity/google/calendar "Calendar") [Docs](https://docs.arcade.dev/toolkits/productivity/google/docs "Docs")