---
url: "https://docs.arcade.dev/toolkits/productivity/microsoft/outlook_mail"
title: "Arcade Docs"
---

[Integrations](https://docs.arcade.dev/toolkits "Integrations") [Productivity & Docs](https://docs.arcade.dev/toolkits/productivity/google "Productivity & Docs") [Microsoft](https://docs.arcade.dev/toolkits/productivity/microsoft/outlook_calendar "Microsoft") Outlook Mail

# Outlook Mail

**Description:** Enable agents to read, write, and send emails with Outlook.

**Author:** Arcade

**Code:** [GitHub](https://github.com/ArcadeAI/arcade-ai/tree/main/toolkits/microsoft)

**Auth:** User authorizationvia the [Microsoft auth provider](https://docs.arcade.dev/home/auth-providers/microsoft)

[![PyPI Version](https://img.shields.io/pypi/v/arcade_microsoft)](https://pypi.org/project/arcade_microsoft/)[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/arcadeai/arcade-ai/blob/main/LICENSE)[![Python Versions](https://img.shields.io/pypi/pyversions/arcade_microsoft)](https://pypi.org/project/arcade_microsoft/)[![Wheel Status](https://img.shields.io/pypi/wheel/arcade_microsoft)](https://pypi.org/project/arcade_microsoft/)[![Downloads](https://img.shields.io/pypi/dm/arcade_microsoft)](https://pypi.org/project/arcade_microsoft/)

The Arcade Outlook Mail toolkit provides pre-built tools for working with emails using the Outlook API. Use these tools to:

- Read emails
- Write emails
- Send emails

## Available Tools [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/microsoft/outlook_mail\#available-tools)

These tools are currently available in the Arcade Sheets toolkit.

| Tool Name | Description |
| --- | --- |
| CreateDraftEmail | Compose a new draft email in Outlook |
| UpdateDraftEmail | Update an existing draft email in Outlook |
| SendDraftEmail | Send an existing draft email in Outlook |
| CreateAndSendEmail | Create and immediately send a new email in Outlook to the specified recipients |
| ReplyToEmail | Reply only to the sender of an existing email in Outlook. |
| ReplyAllToEmail | Reply to all recipients of an existing email in Outlook. |
| ListEmails | List emails in the user's mailbox across all folders. |
| ListEmailsInFolder | List the user's emails in the specified folder. |

If you need to perform an action that’s not listed here, you can [get in touch\\
with us](mailto:contact@arcade.dev) to request a new tool, or [create your\\
own tools](https://docs.arcade.dev/home/build-tools/create-a-toolkit) with the [Google auth\\
provider](https://docs.arcade.dev/home/auth-providers/google#using-google-auth-in-custom-tools).

## CreateDraftEmail [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/microsoft/outlook_mail\#createdraftemail)

Compose a new draft email in Outlook.

**Parameters**

- **`subject`** _(string, required)_: The subject of the email to create.
- **`body`** _(string, required)_: The body of the email to create.
- **`to_recipients`** _(list of strings, required)_: The email addresses that will be the recipients of the draft email.
- **`cc_recipients`** _(list of strings, optional)_: The email addresses that will be the CC recipients of the draft email.
- **`bcc_recipients`** _(list of strings, optional)_: The email addresses that will be the BCC recipients of the draft email.

See Example >

* * *

## UpdateDraftEmail [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/microsoft/outlook_mail\#updatedraftemail)

Update an existing draft email in Outlook.

This tool overwrites the subject and body of a draft email (if provided),
and modifies its recipient lists by selectively adding or removing email addresses.

This tool can update any un-sent email:

- draft
- reply-draft
- reply-all draft
- forward draft

**Parameters**

- **`message_id`** _(string, required)_: The ID of the draft email to update.
- **`subject`** _(string, optional)_: The new subject of the draft email. If provided, the existing subject will be overwritten.
- **`body`** _(string, optional)_: The new body of the draft email. If provided, the existing body will be overwritten
- **`to_add`** _(list of strings, optional)_: Email addresses to add as ‘To’ recipients.
- **`to_remove`** _(list of strings, optional)_: Email addresses to remove from the current ‘To’ recipients.
- **`cc_add`** _(list of strings, optional)_: Email addresses to add as ‘CC’ recipients.
- **`cc_remove`** _(list of strings, optional)_: Email addresses to remove from the current ‘CC’ recipients.
- **`bcc_add`** _(list of strings, optional)_: Email addresses to add as ‘BCC’ recipients.
- **`bcc_remove`** _(list of strings, optional)_: Email addresses to remove from the current ‘BCC’ recipients.

See Example >

* * *

## SendDraftEmail [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/microsoft/outlook_mail\#senddraftemail)

Send an existing draft email in Outlook

This tool can send any un-sent email:

- draft
- reply-draft
- reply-all draft
- forward draft

**Parameters**

- **`message_id`** (string, required): The ID of the draft email to send

See Example >

* * *

## CreateAndSendEmail [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/microsoft/outlook_mail\#createandsendemail)

Create and immediately send a new email in Outlook to the specified recipients

**Parameters**

- **`subject`** (string, required): The subject of the email to create
- **`body`** (string, required): The body of the email to create
- **`to_recipients`** (list\[str\], required): The email addresses that will be the recipients of the email
- **`cc_recipients`** (list\[str\], optional): The email addresses that will be the CC recipients of the email.
- **`bcc_recipients`** (list\[str\], optional): The email addresses that will be the BCC recipients of the email.

See Example >

* * *

## ReplyToEmail [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/microsoft/outlook_mail\#replytoemail)

Reply to an existing email in Outlook.

Use this tool to reply to the sender or all recipients of the email.
Specify the reply\_type to determine the scope of the reply.

**Parameters**

- **`message_id`** (string, required): The ID of the email to reply to
- **`body`** (string, required): The body of the reply to the email
- **`reply_type`** (enum ( [ReplyType](https://docs.arcade.dev/toolkits/productivity/microsoft/outlook_mail#replytype)), required): Specify “reply” to reply only to the sender or “reply\_all” to reply to all recipients.

See Example >

* * *

## ListEmails [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/microsoft/outlook_mail\#listemails)

List emails in the user’s mailbox across all folders.

Since this tool lists email across all folders, it may return sent items, drafts,
and other items that are not in the inbox.

**Parameters**

- **`limit`** (int, optional): The number of messages to return. Max is 100. Defaults to 5.
- **`pagination_token`** (str, optional): The pagination token to continue a previous request

See Example >

* * *

## ListEmailsInFolder [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/microsoft/outlook_mail\#listemailsinfolder)

List the user’s emails in the specified folder.

Exactly one of `well_known_folder_name` or `folder_id` MUST be provided.

**Parameters**

- **`well_known_folder_name`** (enum ( [WellKnownFolderNames](https://docs.arcade.dev/toolkits/productivity/microsoft/outlook_mail#wellknownfoldernames)), optional): The name of the folder to list emails from. Defaults to None.
- **`folder_id`** (str, optional): The ID of the folder to list emails from if the folder is not a well-known folder. Defaults to None.
- **`limit`** (int, optional): The number of messages to return. Max is 100. Defaults to 5.
- **`pagination_token`** (str, optional): The pagination token to continue a previous request

See Example >

* * *

## Auth [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/microsoft/outlook_mail\#auth)

The Arcade Outlook Mail toolkit uses the [Microsoft auth provider](https://docs.arcade.dev/home/auth-providers/microsoft) to connect to users’ Microsoft accounts.

With the hosted Arcade Engine, there’s nothing to configure. Your users will see `Arcade` as the name of the application that’s requesting permission.

With a self-hosted installation of Arcade, you need to [configure the Microsoft auth provider](https://docs.arcade.dev/home/auth-providers/microsoft#configuring-microsoft-auth) with your own Microsoft app credentials.

* * *

## Reference [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/microsoft/outlook_mail\#reference)

### WellKnownFolderNames [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/microsoft/outlook_mail\#wellknownfoldernames)

Well-known folder names that are created for users by default.
Instead of using the ID of these folders, you can use the well-known folder names.

- **`DELETED_ITEMS`** _(string: “deleteditems”)_
- **`DRAFTS`** _(string: “drafts”)_
- **`INBOX`** _(string: “inbox”)_
- **`JUNK_EMAIL`** _(string: “junkemail”)_
- **`SENT_ITEMS`** _(string: “sentitems”)_
- **`STARRED`** _(string: “starred”)_
- **`TODO`** _(string: “tasks”)_

### ReplyType [Permalink for this section](https://docs.arcade.dev/toolkits/productivity/microsoft/outlook_mail\#replytype)

The type of reply to send to an email.

- **`REPLY`** _(string: “reply”)_
- **`REPLY_ALL`** _(string: “reply\_all”)_

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

[Outlook Calendar](https://docs.arcade.dev/toolkits/productivity/microsoft/outlook_calendar "Outlook Calendar") [Obsidian](https://docs.arcade.dev/toolkits/productivity/obsidian "Obsidian")