---
url: "https://docs.arcade.dev/toolkits/productivity/notion"
title: "Arcade Docs"
---

[Integrations](https://docs.arcade.dev/toolkits "Integrations") [Productivity & Docs](https://docs.arcade.dev/toolkits/productivity/google "Productivity & Docs") Notion

# Notion

**Description:** Enable agents to interact with Notion.

**Author:** Arcade

**Code:** [GitHub](https://github.com/ArcadeAI/arcade-ai/tree/main/toolkits/notion)

**Auth:** User authorizationvia the [Notion auth provider](https://docs.arcade.dev/home/auth-providers/notion)

[![PyPI Version](https://img.shields.io/pypi/v/arcade_notion-toolkit)](https://pypi.org/project/arcade_notion-toolkit/)[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/arcadeai/arcade-ai/blob/main/LICENSE)[![Python Versions](https://img.shields.io/pypi/pyversions/arcade_notion-toolkit)](https://pypi.org/project/arcade_notion-toolkit/)[![Wheel Status](https://img.shields.io/pypi/wheel/arcade_notion-toolkit)](https://pypi.org/project/arcade_notion-toolkit/)[![Downloads](https://img.shields.io/pypi/dm/arcade_notion-toolkit)](https://pypi.org/project/arcade_notion-toolkit/)

The Arcade Notion toolkit provides a pre-built set of tools for interacting with Notion. These tools make it easy to build agents and AI apps that can:

- Get a page’s content
- Create a new page
- Search for pages or databases by title
- Get the metadata of a Notion object (page or database)
- Get a workspace’s folder structure

## Available tools [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/notion\#available-tools)

These tools are currently available in the Arcade Notion toolkit.

| Tool Name | Description |
| --- | --- |
| GetPageContentById | Get the content of a Notion page as markdown by page ID. |
| GetPageContentByTitle | Get the content of a Notion page as markdown by title. |
| CreatePage | Create a new Notion page by specifying a parent page title. |
| SearchByTitle | Search for pages or databases by title. |
| GetObjectMetadata | Get the metadata of a Notion object (page or database) using its title or ID. |
| GetWorkspaceStructure | Get the complete workspace structure of your Notion workspace. |

If you need to perform an action that’s not listed here, you can [get in touch with us](mailto:contact@arcade.dev) to request a new tool, or [create your own tools](https://docs.arcade.dev/home/build-tools/create-a-toolkit) with the [Notion auth provider](https://docs.arcade.dev/home/auth-providers/notion).

## GetPageContentById [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/notion\#getpagecontentbyid)

See Example >

Get the content of a Notion page as markdown with the page’s ID.

**Parameters**

- **`page_id`** _(string, required)_ The ID of the page to get content from.

* * *

## GetPageContentByTitle [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/notion\#getpagecontentbytitle)

See Example >

Get the content of a Notion page as markdown with the page’s title.

**Parameters**

- **`title`** _(string, required)_ The title of the page to get content from.

* * *

## CreatePage [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/notion\#createpage)

See Example >

Create a new Notion page by specifying an existing parent page and the new page details.

**Parameters**

- **`parent_title`** _(string, required)_ Title of an existing page where the new page will be created.
- **`title`** _(string, required)_ Title of the new page.
- **`content`** _(string, optional)_ The content of the new page.

* * *

## SearchByTitle [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/notion\#searchbytitle)

See Example >

Search for similar titles of pages, databases, or both within the user’s Notion workspace. This tool returns minimal information about matching objects without their content.

**Parameters**

- **`query`** _(string, optional)_
A substring to search for within page and database titles. If not provided, all items are returned.
- **`select`** _(str, optional)_
Limit the search to only pages or only databases. If provided, must be one of `page` or `database`. Defaults to both.
- **`order_by`** _(str, optional)_
The direction to sort search results by last edited time. Must be either `ascending` or `descending`. Defaults to `descending`.
- **`limit`** _(int, optional)_
The maximum number of results to return. Defaults to 100. Use -1 for no limit.

* * *

## GetObjectMetadata [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/notion\#getobjectmetadata)

See Example >

Get the metadata of a Notion object (page or database) using its title or ID. One of `object_title` or `object_id` must be provided (but not both). The returned metadata includes the object’s ID, timestamps, properties, URL, and more.

**Parameters**

- **`object_title`** _(string, optional)_
The title of the page or database whose metadata to retrieve.
- **`object_id`** _(string, optional)_
The ID of the page or database whose metadata to retrieve.
- **`object_type`** _(str, optional)_
The type of object to match the title against. If provided, must be one of `page` or `database`. Defaults to both if not provided.

* * *

## GetWorkspaceStructure [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/notion\#getworkspacestructure)

See Example >

Get the complete workspace structure of your Notion workspace. This tool returns a hierarchical view of pages and databases, making it easier to understand the organization of your workspace.

**Parameters**

_None_

## Auth [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/notion\#auth)

The Arcade Notion toolkit uses the [Notion auth provider](https://docs.arcade.dev/home/auth-providers/notion) to connect to users’ Notion accounts.

With the hosted Arcade Engine, there’s nothing to configure. Your users will see `Arcade` as the name of the application that’s requesting permission.

With a self-hosted installation of Arcade, you need to [configure the Notion auth provider](https://docs.arcade.dev/home/auth-providers/notion#configuring-notion-auth) with your own Notion app credentials.

## Get Building

[Use tools hosted on Arcade Cloud\\
\\
Arcade tools are hosted by our cloud platform and ready to be used in your agents. Learn how.](https://docs.arcade.dev/home/quickstart)

[Self Host Arcade tools\\
\\
Arcade tools can be self-hosted on your own infrastructure. Learn more about self-hosting.\\
\\
```\\
pip install arcade_notion_toolkit\\
```](https://docs.arcade.dev/home/install/overview)

[Close.io](https://docs.arcade.dev/toolkits/productivity/closeio "Close.io") [Reference](https://docs.arcade.dev/toolkits/productivity/reference "Reference")