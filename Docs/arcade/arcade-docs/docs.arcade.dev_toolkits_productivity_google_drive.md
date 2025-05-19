---
url: "https://docs.arcade.dev/toolkits/productivity/google/drive"
title: "Arcade Docs"
---

[Integrations](https://docs.arcade.dev/toolkits "Integrations") Productivity & Docs [Google](https://docs.arcade.dev/toolkits/productivity/google/calendar "Google") Drive

# Drive

**Description:** Enable agents to interact with Google Drive.

**Author:** Arcade

**Code:** [GitHub](https://github.com/ArcadeAI/arcade-ai/tree/main/toolkits/google)

**Auth:** User authorizationvia the [Google auth provider](https://docs.arcade.dev/home/auth-providers/google)

[![PyPI Version](https://img.shields.io/pypi/v/arcade_google)](https://pypi.org/project/arcade_google/)[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/arcadeai/arcade-ai/blob/main/LICENSE)[![Python Versions](https://img.shields.io/pypi/pyversions/arcade_google)](https://pypi.org/project/arcade_google/)[![Wheel Status](https://img.shields.io/pypi/wheel/arcade_google)](https://pypi.org/project/arcade_google/)[![Downloads](https://img.shields.io/pypi/dm/arcade_google)](https://pypi.org/project/arcade_google/)

The Arcade Drive toolkit provides a pre-built set of tools for interacting with Google Drive. These tools make it easy to build agents and AI apps that can:

- Search Google documents in the user’s Google Drive
- Search and retrieve the contents of Google documents in the user’s Google Drive

## Available Tools [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/google/drive\#available-tools)

These tools are currently available in the Arcade Drive toolkit.

| Tool Name | Description |
| --- | --- |
| SearchDocuments | Search for documents in the user's Google Drive. Note: This tool currently requires a self-hosted instance of Arcade. |
| SearchAndRetrieveDocuments | Search and retrieve the contents of Google documents in the user's Google Drive. Note: This tool currently requires a self-hosted instance of Arcade. |
| GetFileTreeStructure | Get the file/folder tree structure of the user's Google Drive. |
| GenerateGoogleFilePickerUrl | Generate a Google File Picker URL for user-driven file selection and authorization |

If you need to perform an action that’s not listed here, you can [get in touch\\
with us](mailto:contact@arcade.dev) to request a new tool, or [create your\\
own tools](https://docs.arcade.dev/home/build-tools/create-a-toolkit) with the [Google auth\\
provider](https://docs.arcade.dev/home/auth-providers/google#using-google-auth-in-custom-tools).

## SearchDocuments [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/google/drive\#searchdocuments)

See Example >

Search Google documents in the user’s Google Drive. Excludes documents that are in the trash.

**Parameters**

- **`document_contains`** _(list\[str\], optional)_ Keywords or phrases that must be in the document title or body. Provide a list of keywords or phrases if needed.
- **`document_not_contains`** _(list\[str\], optional)_ Keywords or phrases that must not be in the document title or body. Provide a list of keywords or phrases if needed.
- **`search_only_in_shared_drive_id`** _(str, optional)_ The ID of the shared drive to restrict the search to. If provided, the search will only return documents from this drive. Defaults to None, which searches across all drives.
- **`include_shared_drives`** _(bool, optional)_ Whether to include documents from shared drives in the search results. Defaults to False (searches only in the user’s ‘My Drive’).
- **`include_organization_domain_documents`** _(bool, optional)_ Whether to include documents from the organization’s domain. This is applicable to admin users who have permissions to view organization-wide documents in a Google Workspace account. Defaults to False.
- **`order_by`** _(enum ( [OrderBy](https://docs.arcade.dev/toolkits/productivity/google/reference#orderby)), optional)_ Sort order. Defaults to listing the most recently modified documents first.
- **`limit`** _(int, optional)_ The number of documents to list. Defaults to `50`.
- **`pagination_token`** _(str, optional)_ The pagination token to continue a previous request

## SearchAndRetrieveDocuments [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/google/drive\#searchandretrievedocuments)

See Example >

Searches for documents in the user’s Google Drive and returns a list of documents (with text content) matching the search criteria. Excludes documents that are in the trash.

**Parameters**

- **`document_format`** _(enum ( [DocumentFormat](https://docs.arcade.dev/toolkits/productivity/google/reference#documentformat)), optional)_ The format of the document to be returned. Defaults to Markdown.
- **`document_contains`** _(list\[str\], optional)_ Keywords or phrases that must be in the document title or body. Provide a list of keywords or phrases if needed.
- **`document_not_contains`** _(list\[str\], optional)_ Keywords or phrases that must not be in the document title or body. Provide a list of keywords or phrases if needed.
- **`search_only_in_shared_drive_id`** _(str, optional)_ The ID of the shared drive to restrict the search to. If provided, the search will only return documents from this drive. Defaults to None, which searches across all drives.
- **`include_shared_drives`** _(bool, optional)_ Whether to include documents from shared drives in the search results. Defaults to False (searches only in the user’s ‘My Drive’).
- **`include_organization_domain_documents`** _(bool, optional)_ Whether to include documents from the organization’s domain. This is applicable to admin users who have permissions to view organization-wide documents in a Google Workspace account. Defaults to False.
- **`order_by`** _(enum ( [OrderBy](https://docs.arcade.dev/toolkits/productivity/google/reference#orderby)), optional)_ Sort order. Defaults to listing the most recently modified documents first.
- **`limit`** _(int, optional)_ The number of documents to list. Defaults to `50`.
- **`pagination_token`** _(str, optional)_ The pagination token to continue a previous request

## GetFileTreeStructure [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/google/drive\#getfiletreestructure)

See Example >

Get the file/folder tree structure of the user’s Google Drive.

**Parameters**

- **`include_shared_drives`** _(bool, optional)_ Whether to include shared drives in the file tree structure. Defaults to False.
- **`restrict_to_shared_drive_id`** _(str, optional)_ If provided, only include files from this shared drive in the file tree structure. Defaults to None, which will include files and folders from all drives.
- **`include_organization_domain_documents`** _(bool, optional)_ Whether to include documents from the organization’s domain. This is applicable to admin users who have permissions to view organization-wide documents in a Google Workspace account. Defaults to False.
- **`order_by`** _(enum ( [OrderBy](https://docs.arcade.dev/toolkits/productivity/google/reference#orderby)), optional)_ Sort order. Defaults to listing the most recently modified documents first.
- **`limit`** _(int, optional)_ The number of files and folders to list. Defaults to None, which will list all files and folders.

## GenerateGoogleFilePickerUrl [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/google/drive\#generategooglefilepickerurl)

See Example >

Generate a Google File Picker URL for user-driven file selection and authorization.

This tool generates a URL that directs the end-user to a Google File Picker interface where
where they can select or upload Google Drive files. Users can grant permission to access their
Drive files, providing a secure and authorized way to interact with their files.

This is particularly useful when prior tools (e.g., those accessing or modifying
Google Docs, Google Sheets, etc.) encountered failures due to file non-existence
(Requested entity was not found) or permission errors. Once the user completes the file
picker flow, the prior tool can be retried.

## Auth [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/google/drive\#auth)

The Arcade Drive toolkit uses the [Google auth provider](https://docs.arcade.dev/home/auth-providers/google) to connect to users’ Google accounts.

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

[Docs](https://docs.arcade.dev/toolkits/productivity/google/docs "Docs") [Gmail](https://docs.arcade.dev/toolkits/productivity/google/gmail "Gmail")