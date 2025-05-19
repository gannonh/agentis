---
url: "https://docs.arcade.dev/toolkits/productivity/google/docs"
title: "Arcade Docs"
---

[Integrations](https://docs.arcade.dev/toolkits "Integrations") Productivity & Docs [Google](https://docs.arcade.dev/toolkits/productivity/google/calendar "Google") Docs

# Docs

**Description:** Enable agents to interact with Google Docs documents.

**Author:** Arcade

**Code:** [GitHub](https://github.com/ArcadeAI/arcade-ai/tree/main/toolkits/google)

**Auth:** User authorizationvia the [Google auth provider](https://docs.arcade.dev/home/auth-providers/google)

This Toolkit is not available in Arcade Cloud. You can use these tools with a [self-hosted](https://docs.arcade.dev/home/install/overview) instance of Arcade.

[![PyPI Version](https://img.shields.io/pypi/v/arcade_google)](https://pypi.org/project/arcade_google/)[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/arcadeai/arcade-ai/blob/main/LICENSE)[![Python Versions](https://img.shields.io/pypi/pyversions/arcade_google)](https://pypi.org/project/arcade_google/)[![Wheel Status](https://img.shields.io/pypi/wheel/arcade_google)](https://pypi.org/project/arcade_google/)[![Downloads](https://img.shields.io/pypi/dm/arcade_google)](https://pypi.org/project/arcade_google/)

The Arcade Docs toolkit provides a pre-built set of tools for interacting with Google Docs. These tools make it easy to build agents and AI apps that can:

- Create, update, list, and delete documents

## Available Tools [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/google/docs\#available-tools)

These tools are currently available in the Arcade Docs toolkit.

| Tool Name | Description |
| --- | --- |
| GetDocumentById | Retrieve a Google Docs document by ID. Note: This tool currently requires a self-hosted instance of Arcade. |
| InsertTextAtEndOfDocument | Insert text at the end of a Google Docs document. Note: This tool currently requires a self-hosted instance of Arcade. |
| CreateBlankDocument | Create a new blank Google Docs document with a title. Note: This tool currently requires a self-hosted instance of Arcade. |
| CreateDocumentFromText | Create a new Google Docs document with specified text content. Note: This tool currently requires a self-hosted instance of Arcade. |

If you need to perform an action that’s not listed here, you can [get in touch\\
with us](mailto:contact@arcade.dev) to request a new tool, or [create your\\
own tools](https://docs.arcade.dev/home/build-tools/create-a-toolkit) with the [Google auth\\
provider](https://docs.arcade.dev/home/auth-providers/google#using-google-auth-in-custom-tools).

## GetDocumentById [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/google/docs\#getdocumentbyid)

See Example >

Get the latest version of the specified Google Docs document.

**Parameters**

- **`document_id`** _(string, required)_ The ID of the document to retrieve.

* * *

## InsertTextAtEndOfDocument [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/google/docs\#inserttextatendofdocument)

See Example >

Insert text at the end of an existing Google Docs document.

**Parameters**

- **`document_id`** _(string, required)_ The ID of the document to update.
- **`text_content`** _(string, required)_ The text content to insert into the document.

* * *

## CreateBlankDocument [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/google/docs\#createblankdocument)

See Example >

Create a blank Google Docs document with the specified title.

**Parameters**

- **`title`** _(string, required)_ The title of the blank document to create.

* * *

## CreateDocumentFromText [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/google/docs\#createdocumentfromtext)

See Example >

Create a Google Docs document with the specified title and text content.

**Parameters**

- **`title`** _(string, required)_ The title of the document to create.
- **`text_content`** _(string, required)_ The text content to insert into the document.

## Auth [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/google/docs\#auth)

The Arcade Docs toolkit uses the [Google auth provider](https://docs.arcade.dev/home/auth-providers/google) to connect to users’ Google accounts.

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

[Contacts](https://docs.arcade.dev/toolkits/productivity/google/contacts "Contacts") [Drive](https://docs.arcade.dev/toolkits/productivity/google/drive "Drive")