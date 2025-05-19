---
url: "https://docs.arcade.dev/toolkits/productivity/google/gmail"
title: "Arcade Docs"
---

[Integrations](https://docs.arcade.dev/toolkits "Integrations") Productivity & Docs [Google](https://docs.arcade.dev/toolkits/productivity/google/calendar "Google") Gmail

# Gmail

**Description:** Enable agents to send, read, and manage emails in Gmail.

**Author:** Arcade

**Code:** [GitHub](https://github.com/ArcadeAI/arcade-ai/tree/main/toolkits/google)

**Auth:** User authorizationvia the [Google auth provider](https://docs.arcade.dev/home/auth-providers/google)

[![PyPI Version](https://img.shields.io/pypi/v/arcade_google)](https://pypi.org/project/arcade_google/)[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/arcadeai/arcade-ai/blob/main/LICENSE)[![Python Versions](https://img.shields.io/pypi/pyversions/arcade_google)](https://pypi.org/project/arcade_google/)[![Wheel Status](https://img.shields.io/pypi/wheel/arcade_google)](https://pypi.org/project/arcade_google/)[![Downloads](https://img.shields.io/pypi/dm/arcade_google)](https://pypi.org/project/arcade_google/)

The Arcade Gmail toolkit provides a pre-built set of tools for interacting with Gmail. These tools make it easy to build agents and AI apps that can:

- Send, read, and manage emails
- Compose and update draft emails
- Delete emails
- Search for emails by header
- List emails in the user’s mailbox

## Available Tools [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/google/gmail\#available-tools)

These tools are currently available in the Arcade Gmail toolkit.

| Tool Name | Description |
| --- | --- |
| SendEmail | Send an email using the Gmail API. |
| SendDraftEmail | Send a draft email using the Gmail API. |
| WriteDraftEmail | Compose a new email draft using the Gmail API. |
| UpdateDraftEmail | Update an existing email draft. |
| DeleteDraftEmail | Delete a draft email using the Gmail API. |
| TrashEmail | Move an email to the trash folder. |
| ListDraftEmails | List draft emails in the user's mailbox. |
| ListEmailsByHeader | Search for emails by header using the Gmail API. |
| ListEmails | Read emails and extract plain text content. |
| SearchThreads | Search for threads in the user's mailbox. |
| ListThreads | List threads in the user's mailbox. |
| GetThread | Get the specified thread by ID. |

If you need to perform an action that’s not listed here, you can [get in touch\\
with us](mailto:contact@arcade.dev) to request a new tool, or [create your\\
own tools](https://docs.arcade.dev/home/build-tools/create-a-toolkit) with the [Google auth\\
provider](https://docs.arcade.dev/home/auth-providers/google#using-google-auth-in-custom-tools).

## SendEmail [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/google/gmail\#sendemail)

See Example >

Send an email using the Gmail API.

**Parameters**

- **`subject`** _(string, required)_ The subject of the email.
- **`body`** _(string, required)_ The body of the email.
- **`recipient`** _(string, required)_ The recipient of the email.
- **`cc`** _(array, optional, Defaults to None)_ CC recipients of the email.
- **`bcc`** _(array, optional, Defaults to None)_ BCC recipients of the email.

* * *

## SendDraftEmail [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/google/gmail\#senddraftemail)

See Example >

Send a draft email using the Gmail API.

**Parameters**

- **`email_id`** _(string, required)_ The ID of the draft to send.

* * *

## WriteDraftEmail [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/google/gmail\#writedraftemail)

See Example >

Compose a new email draft using the Gmail API.

**Parameters**

- **`subject`** _(string, required)_ The subject of the draft email.
- **`body`** _(string, required)_ The body of the draft email.
- **`recipient`** _(string, required)_ The recipient of the draft email.
- **`cc`** _(array, optional, Defaults to None)_ CC recipients of the draft email.
- **`bcc`** _(array, optional, Defaults to None)_ BCC recipients of the draft email.

* * *

## UpdateDraftEmail [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/google/gmail\#updatedraftemail)

See Example >

Update an existing email draft.

**Parameters**

- **`draft_email_id`** _(string, required)_ The ID of the draft email to update.
- **`subject`** _(string, required)_ The subject of the draft email.
- **`body`** _(string, required)_ The body of the draft email.
- **`recipient`** _(string, required)_ The recipient of the draft email.
- **`cc`** _(array, optional, Defaults to None)_ CC recipients of the draft email.
- **`bcc`** _(array, optional, Defaults to None)_ BCC recipients of the draft email.

* * *

## DeleteDraftEmail [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/google/gmail\#deletedraftemail)

See Example >

Delete a draft email using the Gmail API.

**Parameters**

- **`draft_email_id`** _(string, required)_ The ID of the draft email to delete.

* * *

## TrashEmail [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/google/gmail\#trashemail)

The `TrashEmail` tool is currently only available on a self-hosted instance of the Arcade Engine. To learn more about self-hosting, see the [self-hosting documentation](https://docs.arcade.dev/home/install/local#install-the-engine).

See Example >

Move an email to the trash folder.

**Parameters**

- **`email_id`** _(string, required)_ The ID of the email to trash.

* * *

## ListDraftEmails [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/google/gmail\#listdraftemails)

See Example >

List draft emails in the user’s mailbox.

**Parameters**

- **`n_drafts`** _(integer, optional, Defaults to 5)_ Number of draft emails to read.

* * *

## ListEmailsByHeader [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/google/gmail\#listemailsbyheader)

See Example >

Search for emails by header using the Gmail API.

_At least one of the following parameters must be provided: `sender`, `recipient`, `subject`, `body`._

**Parameters**

- **`sender`** _(string, optional, Defaults to None)_ The name or email address of the sender.
- **`recipient`** _(string, optional, Defaults to None)_ The name or email address of the recipient.
- **`subject`** _(string, optional, Defaults to None)_ Words to find in the subject of the email.
- **`body`** _(string, optional, Defaults to None)_ Words to find in the body of the email.
- **`date_range`** _(string, optional, Defaults to None)_ The date range of the emails.
- **`limit`** _(integer, optional, Defaults to 25)_ The maximum number of emails to return.

* * *

## ListEmails [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/google/gmail\#listemails)

See Example >

Read emails from a Gmail account and extract plain text content.

**Parameters**

- **`n_emails`** _(integer, optional, Defaults to 5)_ Number of emails to read.

* * *

## SearchThreads [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/google/gmail\#searchthreads)

See Example >

Search for threads in the user’s mailbox

**Parameters**

- **`page_token`** _(string, optional)_ Page token to retrieve a specific page of results in the list.
- **`max_results`** _(integer, optional, Defaults to `10`)_ The maximum number of threads to return.
- **`include_spam_trash`** _(boolean, optional)_ Whether to include spam and trash in the results.
- **`label_ids`** _(array, optional)_ The IDs of labels to filter by.
- **`sender`** _(string, optional)_ The name or email address of the sender of the email.
- **`recipient`** _(string, optional)_ The name or email address of the recipient.
- **`subject`** _(string, optional)_ Words to find in the subject of the email.
- **`body`** _(string, optional)_ Words to find in the body of the email.
- **`date_range`** _(string, optional)_ The date range of the email. Valid values are ‘today’, ‘yesterday’, ‘last\_7\_days’, ‘last\_30\_days’, ‘this\_month’, ‘last\_month’, ‘this\_year’.

* * *

## ListThreads [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/google/gmail\#listthreads)

See Example >

List threads in the user’s mailbox.

**Parameters**

- **`page_token`** _(string, optional)_ Page token to retrieve a specific page of results in the list.
- **`max_results`** _(integer, optional, Defaults to `10`)_ The maximum number of threads to return.
- **`include_spam_trash`** _(boolean, optional)_ Whether to include spam and trash in the results.

* * *

## GetThread [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/google/gmail\#getthread)

See Example >

Get the specified thread by ID.

**Parameters**

- **`thread_id`** _(string, required)_ The ID of the thread to retrieve.

## Auth [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/google/gmail\#auth)

The Arcade Gmail toolkit uses the [Google auth provider](https://docs.arcade.dev/home/auth-providers/google) to connect to users’ Google accounts.

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

[Drive](https://docs.arcade.dev/toolkits/productivity/google/drive "Drive") [Sheets](https://docs.arcade.dev/toolkits/productivity/google/sheets "Sheets")