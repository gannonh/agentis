---
url: "https://docs.arcade.dev/toolkits/social-communication/x"
title: "Arcade Docs"
---

[Integrations](https://docs.arcade.dev/toolkits "Integrations") [Social & Communication](https://docs.arcade.dev/toolkits/social-communication/twilio "Social & Communication") X

# X (Twitter)

**Description:** Enable agents to interact with X (formerly Twitter).

**Author:** Arcade

**Code:** [GitHub](https://github.com/ArcadeAI/arcade-ai/tree/main/toolkits/x)

**Auth:** User authorizationvia the [X auth provider](https://docs.arcade.dev/home/auth-providers/x)

[![PyPI Version](https://img.shields.io/pypi/v/arcade_x)](https://pypi.org/project/arcade_x/)[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/arcadeai/arcade-ai/blob/main/LICENSE)[![Python Versions](https://img.shields.io/pypi/pyversions/arcade_x)](https://pypi.org/project/arcade_x/)[![Wheel Status](https://img.shields.io/pypi/wheel/arcade_x)](https://pypi.org/project/arcade_x/)[![Downloads](https://img.shields.io/pypi/dm/arcade_x)](https://pypi.org/project/arcade_x/)

The Arcade X (Twitter) toolkit provides a pre-built set of tools for interacting with X (formerly Twitter). These tools make it easy to build agents and AI apps that can:

- Post tweets
- Delete tweets
- Search for tweets by username
- Search for tweets by keywords
- Look up a user by username

## Available Tools [Permalink for this section](https://docs.arcade.dev/toolkits/social-communication/x\#available-tools)

These tools are currently available in the Arcade X toolkit.

| Tool Name | Description |
| --- | --- |
| PostTweet | Post a tweet to X (Twitter). |
| DeleteTweetById | Delete a tweet on X (Twitter). |
| SearchRecentTweetsByUsername | Search recent tweets by username. |
| SearchRecentTweetsByKeywords | Search recent tweets by keywords or phrases. |
| LookupSingleUserByUsername | Look up a user on X (Twitter) by username. |

If you need to perform an action that’s not listed here, you can [get in touch\\
with us](mailto:contact@arcade.dev) to request a new tool, or [create your\\
own tools](https://docs.arcade.dev/home/build-tools/create-a-toolkit) with the [X auth\\
provider](https://docs.arcade.dev/home/auth-providers/x#using-x-auth-in-custom-tools).

## PostTweet [Permalink for this section](https://docs.arcade.dev/toolkits/social-communication/x\#posttweet)

See Example >

Post a tweet to X (Twitter).

**Parameters**

- **`tweet_text`** _(string, required)_ The text content of the tweet you want to post.

* * *

## DeleteTweetById [Permalink for this section](https://docs.arcade.dev/toolkits/social-communication/x\#deletetweetbyid)

See Example >

Delete a tweet on X (Twitter).

**Parameters**

- **`tweet_id`** _(string, required)_ The ID of the tweet you want to delete.

* * *

## SearchRecentTweetsByUsername [Permalink for this section](https://docs.arcade.dev/toolkits/social-communication/x\#searchrecenttweetsbyusername)

See Example >

Search for recent tweets (last 7 days) on X (Twitter) by username. Includes replies and reposts.

**Parameters**

- **`username`** _(string, required)_ The username of the X (Twitter) user to look up.
- **`max_results`** _(integer, optional, Defaults to 10)_ The maximum number of results to return. Cannot be less than 10.
- **`next_token`** _(string, optional)_ The pagination token starting from which to return results.

* * *

## SearchRecentTweetsByKeywords [Permalink for this section](https://docs.arcade.dev/toolkits/social-communication/x\#searchrecenttweetsbykeywords)

See Example >

Search for recent tweets (last 7 days) on X (Twitter) by required keywords and phrases. Includes replies and reposts.

_At least one of the following parameters must be provided: `keywords`, `phrases`._

**Parameters**

- **`keywords`** _(array of strings, optional)_ List of keywords that must be present in the tweet.
- **`phrases`** _(array of strings, optional)_ List of phrases that must be present in the tweet.
- **`max_results`** _(integer, optional, Defaults to 10)_ The maximum number of results to return. Cannot be less than 10.

* * *

## LookupTweetById [Permalink for this section](https://docs.arcade.dev/toolkits/social-communication/x\#lookuptweetbyid)

See Example >

Look up a tweet on X (Twitter) by its ID.

**Parameters**

- **`tweet_id`** _(string, required)_ The ID of the tweet to look up.

* * *

## LookupSingleUserByUsername [Permalink for this section](https://docs.arcade.dev/toolkits/social-communication/x\#lookupsingleuserbyusername)

See Example >

Look up a user on X (Twitter) by their username.

**Parameters**

- **`username`** _(string, required)_ The username of the X (Twitter) user to look up.

## Auth [Permalink for this section](https://docs.arcade.dev/toolkits/social-communication/x\#auth)

The Arcade X (Twitter) toolkit uses the [X auth provider](https://docs.arcade.dev/home/auth-providers/x) to connect to users’ X (formerly Twitter) accounts.

With the hosted Arcade Engine, there’s nothing to configure. Your users will see `Arcade` as the name of the application that’s requesting permission.

With a self-hosted installation of Arcade, you need to [configure the X auth provider](https://docs.arcade.dev/home/auth-providers/x#configuring-x-auth) with your own X (formerly Twitter) app credentials.

## Get Building

[Use tools hosted on Arcade Cloud\\
\\
Arcade tools are hosted by our cloud platform and ready to be used in your agents. Learn how.](https://docs.arcade.dev/home/quickstart)

[Self Host Arcade tools\\
\\
Arcade tools can be self-hosted on your own infrastructure. Learn more about self-hosting.\\
\\
```\\
pip install arcade_x\\
```](https://docs.arcade.dev/home/install/overview)

[Slack](https://docs.arcade.dev/toolkits/social-communication/slack "Slack") [Zoom](https://docs.arcade.dev/toolkits/social-communication/zoom "Zoom")