---
url: "https://docs.arcade.dev/toolkits/social-communication/slack"
title: "Arcade Docs"
---

[Integrations](https://docs.arcade.dev/toolkits "Integrations") [Social & Communication](https://docs.arcade.dev/toolkits/social-communication/twilio "Social & Communication") Slack

# Slack

**Description:** Enable agents to interact with Slack by sending messages, retrieving user and conversation information.

**Author:** Arcade

**Code:** [GitHub](https://github.com/ArcadeAI/arcade-ai/tree/main/toolkits/slack)

**Auth:** User authorizationvia the [Slack auth provider](https://docs.arcade.dev/home/auth-providers/slack)

[![PyPI Version](https://img.shields.io/pypi/v/arcade_slack)](https://pypi.org/project/arcade_slack/)[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/arcadeai/arcade-ai/blob/main/LICENSE)[![Python Versions](https://img.shields.io/pypi/pyversions/arcade_slack)](https://pypi.org/project/arcade_slack/)[![Wheel Status](https://img.shields.io/pypi/wheel/arcade_slack)](https://pypi.org/project/arcade_slack/)[![Downloads](https://img.shields.io/pypi/dm/arcade_slack)](https://pypi.org/project/arcade_slack/)

The Arcade Slack toolkit provides a comprehensive set of tools for interacting with Slack. With these tools, you can build agents and AI applications that can:

- Send direct messages to users
- Send messages to channels
- Retrieve members of conversations
- Access conversation messages
- Manage conversation metadata
- Retrieve user information
- List users
- List conversations
- Retrieve messages in a channel, direct or multi-person conversation
- Retrieve conversation metadata

## Available Tools [Permalink for this section](https://docs.arcade.dev/toolkits/social-communication/slack\#available-tools)

These tools are currently available in the Arcade Slack toolkit.

| Tool Name | Description |
| --- | --- |
| SendDmToUser | Send a direct message to a user in Slack. |
| SendMessageToChannel | Send a message to a channel in Slack. |
| GetMembersInConversationById | Retrieve members of a conversation using its ID. |
| GetMembersInChannelByName | Retrieve members of a channel using its name. |
| GetMessagesInConversationById | Fetch the messages in a conversation using its ID. |
| GetMessagesInChannelByName | Fetch the messages in a channel using its name. |
| GetMessagesInDirectMessageConversationByUsername | Fetch the messages in a direct message conversation using the username of the other participant. |
| GetMessagesInMultiPersonDmConversationByUsername | Fetch the messages in a multi-person direct message conversation using the usernames of the other participants. |
| GetConversationMetadataById | Retrieve metadata of a conversation using its ID. |
| GetChannelMetadataByName | Retrieve metadata of a channel using its name. |
| GetDirectMessageConversationMetadataByUsername | Retrieve metadata of a direct message conversation using the username of the other participant. |
| GetMultiPersonDmConversationMetadataByUsername | Retrieve metadata of a multi-person direct message conversation using the usernames of the other participants. |
| ListConversationsMetadata | List metadata for Slack conversations. |
| ListPublicChannelsMetadata | List metadata for public channels in Slack. |
| ListPrivateChannelsMetadata | List metadata for private channels in Slack. |
| ListGroupDirectMessageConversationsMetadata | List metadata for group direct message conversations in Slack. |
| ListDirectMessageConversationsMetadata | List metadata for direct message conversations in Slack. |
| GetUserInfoById | Retrieve information of a user by their ID. |
| ListUsers | List all users in the authenticated Slack team. |

If you need to perform an action that’s not listed here, you can [get in touch\\
with us](mailto:contact@arcade.dev) to request a new tool, or [create your own\\
tools](https://docs.arcade.dev/home/build-tools/create-a-toolkit) with the [Slack auth\\
provider](https://docs.arcade.dev/home/auth-providers/slack#using-slack-auth-in-custom-tools).

## SendDmToUser [Permalink for this section](https://docs.arcade.dev/toolkits/social-communication/slack\#senddmtouser)

See Example >

Send a direct message to a user in Slack.

**Parameters**

- **`user_name`** _(string, required)_ The Slack username of the person you want to message. Slack usernames are ALWAYS lowercase.
- **`message`** _(string, required)_ The message you want to send.

* * *

## SendMessageToChannel [Permalink for this section](https://docs.arcade.dev/toolkits/social-communication/slack\#sendmessagetochannel)

See Example >

Send a message to a channel in Slack.

**Parameters**

- **`channel_name`** _(string, required)_ The Slack channel name where you want to send the message. Slack channel names are ALWAYS lowercase.
- **`message`** _(string, required)_ The message you want to send.

* * *

## GetMembersInConversationById [Permalink for this section](https://docs.arcade.dev/toolkits/social-communication/slack\#getmembersinconversationbyid)

See Example >

Get the members of a conversation in Slack by the conversation’s ID.

**Parameters**

- **`conversation_id`** _(string, required)_ The ID of the conversation to get members for.
- **`limit`** _(int, optional)_ The maximum number of members to return. Defaults to 200.
- **`next_cursor`** _(string, optional)_ The cursor to use for pagination.

* * *

## GetMembersInChannelByName [Permalink for this section](https://docs.arcade.dev/toolkits/social-communication/slack\#getmembersinchannelbyname)

See Example >

Get the members of a channel in Slack by the channel’s name.

**Parameters**

- **`channel_name`** _(string, required)_ The name of the channel to get members for.
- **`limit`** _(int, optional)_ The maximum number of members to return. Defaults to 200.
- **`next_cursor`** _(string, optional)_ The cursor to use for pagination.

* * *

## GetMessagesInConversationById [Permalink for this section](https://docs.arcade.dev/toolkits/social-communication/slack\#getmessagesinconversationbyid)

See Example >

Get the history of a conversation in Slack.

**Parameters**

- **`conversation_id`** _(string, required)_ The ID of the conversation to get history for.
- **`oldest_relative`** _(string, optional)_ The oldest message to include, in ‘DD:HH:MM’ format.
- **`latest_relative`** _(string, optional)_ The latest message to include, in ‘DD:HH:MM’ format.
- **`oldest_datetime`** _(string, optional)_ The oldest message to include, in ‘YYYY-MM-DD HH:MM:SS’ format.
- **`latest_datetime`** _(string, optional)_ The latest message to include, in ‘YYYY-MM-DD HH:MM:SS’ format.
- **`limit`** _(int, optional)_ The maximum number of messages to return. Defaults to 200.
- **`next_cursor`** _(string, optional)_ The cursor to use for pagination, if continuing from a previous search.

* * *

## GetMessagesInChannelByName [Permalink for this section](https://docs.arcade.dev/toolkits/social-communication/slack\#getmessagesinchannelbyname)

See Example >

Get the messages in a channel in Slack.

**Parameters**

- **`channel_name`** _(string, required)_ The name of the channel to get messages for.
- **`oldest_relative`** _(string, optional)_ The oldest message to include in the results, specified as a time offset from the current time in the format ‘DD:HH:MM’.
- **`latest_relative`** _(string, optional)_ The latest message to include in the results, specified as a time offset from the current time in the format ‘DD:HH:MM’.
- **`oldest_datetime`** _(string, optional)_ The oldest message to include in the results, specified as a datetime string in the format ‘YYYY-MM-DD HH:MM:SS’.
- **`latest_datetime`** _(string, optional)_ The latest message to include in the results, specified as a datetime string in the format ‘YYYY-MM-DD HH:MM:SS’.
- **`limit`** _(int, optional)_ The maximum number of messages to return. Defaults to 200.
- **`next_cursor`** _(string, optional)_ The cursor to use for pagination.

* * *

## GetMessagesInDirectMessageConversationByUsername [Permalink for this section](https://docs.arcade.dev/toolkits/social-communication/slack\#getmessagesindirectmessageconversationbyusername)

See Example >

Get the messages in a Direct Message conversation with another user in Slack.

**Parameters**

- **`username`** _(string, required)_ The username of the user to get messages with.
- **`oldest_relative`** _(string, optional)_ The oldest message to include in the results, specified as a time offset from the current time in the format ‘DD:HH:MM’.
- **`latest_relative`** _(string, optional)_ The latest message to include in the results, specified as a time offset from the current time in the format ‘DD:HH:MM’.
- **`oldest_datetime`** _(string, optional)_ The oldest message to include in the results, specified as a datetime string in the format ‘YYYY-MM-DD HH:MM:SS’.
- **`latest_datetime`** _(string, optional)_ The latest message to include in the results, specified as a datetime string in the format ‘YYYY-MM-DD HH:MM:SS’.
- **`limit`** _(int, optional)_ The maximum number of messages to return. Defaults to 200.
- **`next_cursor`** _(string, optional)_ The cursor to use for pagination.

* * *

## GetMessagesInMultiPersonDmConversationByUsername [Permalink for this section](https://docs.arcade.dev/toolkits/social-communication/slack\#getmessagesinmultipersondmconversationbyusername)

See Example >

Get the messages in a multi-person direct message conversation in Slack by the usernames of the participants (other than the currently authenticated user).

**Parameters**

- **`usernames`** _(list of strings, required)_ The usernames of the users to get messages with.
- **`oldest_relative`** _(string, optional)_ The oldest message to include in the results, specified as a time offset from the current time in the format ‘DD:HH:MM’.
- **`latest_relative`** _(string, optional)_ The latest message to include in the results, specified as a time offset from the current time in the format ‘DD:HH:MM’.
- **`oldest_datetime`** _(string, optional)_ The oldest message to include in the results, specified as a datetime string in the format ‘YYYY-MM-DD HH:MM:SS’.
- **`latest_datetime`** _(string, optional)_ The latest message to include in the results, specified as a datetime string in the format ‘YYYY-MM-DD HH:MM:SS’.
- **`limit`** _(int, optional)_ The maximum number of messages to return. Defaults to 200.
- **`next_cursor`** _(string, optional)_ The cursor to use for pagination.

* * *

## GetConversationMetadataById [Permalink for this section](https://docs.arcade.dev/toolkits/social-communication/slack\#getconversationmetadatabyid)

See Example >

Get the metadata of a conversation in Slack searching by its ID.

**Parameters**

- **`conversation_id`** _(string, required)_ The ID of the conversation to get metadata for.

* * *

## GetChannelMetadataByName [Permalink for this section](https://docs.arcade.dev/toolkits/social-communication/slack\#getchannelmetadatabyname)

See Example >

Get the metadata of a channel in Slack searching by its name.

**Parameters**

- **`channel_name`** _(string, required)_ The name of the channel to get metadata for.
- **`next_cursor`** _(string, optional)_ The cursor to use for pagination, if continuing from a previous search.

* * *

## GetDirectMessageConversationMetadataByUsername [Permalink for this section](https://docs.arcade.dev/toolkits/social-communication/slack\#getdirectmessageconversationmetadatabyusername)

See Example >

Get the metadata of a direct message conversation in Slack searching by the username of the other participant.

**Parameters**

- **`username`** _(string, required)_ The username of the user/person to get messages with.
- **`next_cursor`** _(string, optional)_ The cursor to use for pagination, if continuing from a previous search.

* * *

## GetMultiPersonDmConversationMetadataByUsername [Permalink for this section](https://docs.arcade.dev/toolkits/social-communication/slack\#getmultipersondmconversationmetadatabyusername)

See Example >

Get the metadata of a multi-person direct message conversation in Slack searching by the usernames of the participants (other than the currently authenticated user).

**Parameters**

- **`usernames`** _(list of strings, required)_ The usernames of the users to get messages with.
- **`next_cursor`** _(string, optional)_ The cursor to use for pagination, if continuing from a previous search.

* * *

## ListConversationsMetadata [Permalink for this section](https://docs.arcade.dev/toolkits/social-communication/slack\#listconversationsmetadata)

See Example >

List metadata for Slack conversations (channels and/or direct messages) that the user is a member of.

**Parameters**

- **`conversation_types`** _(list of str, optional)_ The type(s) of conversations to list. Defaults to all types. Each must be one of: ‘public\_channel’, ‘private\_channel’, ‘multi\_person\_direct\_message’, or ‘direct\_message’.
- **`limit`** _(int, optional)_ The maximum number of conversations to list. Defaults to 200.
- **`next_cursor`** _(string, optional)_ The cursor to use for pagination.

* * *

## ListPublicChannelsMetadata [Permalink for this section](https://docs.arcade.dev/toolkits/social-communication/slack\#listpublicchannelsmetadata)

See Example >

List metadata for public channels in Slack that the user is a member of.

**Parameters**

- **`limit`** _(int, optional)_ The maximum number of channels to list. Defaults to 200.

* * *

## ListPrivateChannelsMetadata [Permalink for this section](https://docs.arcade.dev/toolkits/social-communication/slack\#listprivatechannelsmetadata)

See Example >

List metadata for private channels in Slack that the user is a member of.

**Parameters**

- **`limit`** _(int, optional)_ The maximum number of channels to list. Defaults to 200.

* * *

## ListGroupDirectMessageConversationsMetadata [Permalink for this section](https://docs.arcade.dev/toolkits/social-communication/slack\#listgroupdirectmessageconversationsmetadata)

See Example >

List metadata for group direct message conversations in Slack that the user is a member of.

**Parameters**

- **`limit`** _(int, optional)_ The maximum number of conversations to list. Defaults to 200.

* * *

## ListDirectMessageConversationsMetadata [Permalink for this section](https://docs.arcade.dev/toolkits/social-communication/slack\#listdirectmessageconversationsmetadata)

See Example >

List metadata for direct message conversations in Slack that the user is a member of.

**Parameters**

- **`limit`** _(int, optional)_ The maximum number of channels to list. Defaults to 200.

* * *

## GetUserInfoById [Permalink for this section](https://docs.arcade.dev/toolkits/social-communication/slack\#getuserinfobyid)

See Example >

Get the information of a user in Slack.

**Parameters**

- **`user_id`** _(string, required)_ The ID of the user to get.

* * *

## ListUsers [Permalink for this section](https://docs.arcade.dev/toolkits/social-communication/slack\#listusers)

See Example >

List all users in the authenticated user’s Slack team.

**Parameters**

- **`exclude_bots`** _(bool, optional)_ Whether to exclude bots from the results. Defaults to `True`.
- **`limit`** _(int, optional)_ The maximum number of users to return. Defaults to 200.
- **`next_cursor`** _(string, optional)_ The cursor to use for pagination.

* * *

## Auth [Permalink for this section](https://docs.arcade.dev/toolkits/social-communication/slack\#auth)

The Arcade Slack toolkit uses the [Slack auth provider](https://docs.arcade.dev/home/auth-providers/slack) to connect to users’ Slack accounts.

With the hosted Arcade Engine, there’s nothing to configure. Your users will see `Arcade` as the name of the application that’s requesting permission.

With a self-hosted installation of Arcade, you need to [configure the Slack auth provider](https://docs.arcade.dev/home/auth-providers/slack#configuring-slack-auth) with your own Slack app credentials.

## Get Building

[Use tools hosted on Arcade Cloud\\
\\
Arcade tools are hosted by our cloud platform and ready to be used in your agents. Learn how.](https://docs.arcade.dev/home/quickstart)

[Self Host Arcade tools\\
\\
Arcade tools can be self-hosted on your own infrastructure. Learn more about self-hosting.\\
\\
```\\
pip install arcade_slack\\
```](https://docs.arcade.dev/home/install/overview)

[Reddit](https://docs.arcade.dev/toolkits/social-communication/reddit "Reddit") [X](https://docs.arcade.dev/toolkits/social-communication/x "X")