---
url: "https://docs.arcade.dev/toolkits/social-communication/reddit"
title: "Arcade Docs"
---

[Integrations](https://docs.arcade.dev/toolkits "Integrations") [Social & Communication](https://docs.arcade.dev/toolkits/social-communication/twilio "Social & Communication") Reddit

# Reddit

**Description:** Enable agents to interact with Reddit.

**Author:** Arcade

**Code:** [GitHub](https://github.com/ArcadeAI/arcade-ai/tree/main/toolkits/reddit)

**Auth:** User authorizationvia the [Reddit auth provider](https://docs.arcade.dev/home/auth-providers/reddit)

[![PyPI Version](https://img.shields.io/pypi/v/arcade_reddit)](https://pypi.org/project/arcade_reddit/)[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/arcadeai/arcade-ai/blob/main/LICENSE)[![Python Versions](https://img.shields.io/pypi/pyversions/arcade_reddit)](https://pypi.org/project/arcade_reddit/)[![Wheel Status](https://img.shields.io/pypi/wheel/arcade_reddit)](https://pypi.org/project/arcade_reddit/)[![Downloads](https://img.shields.io/pypi/dm/arcade_reddit)](https://pypi.org/project/arcade_reddit/)

The Arcade Reddit toolkit provides a pre-built set of tools for interacting with Reddit. These tools make it easy to build agents and AI apps that can:

- Submit text posts
- Comment on posts
- Reply to comments
- Get posts (title and other metadata) in a subreddit
- Get content (body) of posts
- Get top-level comments of a post
- Determine if a subreddit exists or is private
- Get rules of a subreddit
- Get the authenticated user’s username
- Get posts by the authenticated user

## Available Tools [Permalink for this section](https://docs.arcade.dev/toolkits/social-communication/reddit\#available-tools)

These tools are currently available in the Arcade Reddit toolkit.

| Tool Name | Description |
| --- | --- |
| SubmitTextPost | Submit a text-based post to Reddit. |
| CommentOnPost | Comment on a Reddit post. |
| ReplyToComment | Reply to a Reddit comment. |
| GetPostsInSubreddit | Gets posts titles, links, and other metadata in the specified subreddit |
| GetContentOfPost | Get content (body) of a Reddit post. |
| GetContentOfMultiplePosts | Get content (body) of multiple Reddit posts. |
| GetTopLevelCommentsOfPost | Get the first page of top-level comments of a Reddit post. |
| CheckSubredditAccess | Check whether a user has access to a subreddit, including whether it exists |
| GetSubredditRules | Get the rules of a subreddit |
| GetMyUsername | Get the authenticated user's username |
| GetMyPosts | Get posts created by the authenticated user |

If you need to perform an action that’s not listed here, you can [get in touch\\
with us](mailto:contact@arcade.dev) to request a new tool, or [create your\\
own tools](https://docs.arcade.dev/home/build-tools/create-a-toolkit) with the [Reddit auth\\
provider](https://docs.arcade.dev/home/auth-providers/reddit#using-reddit-auth-in-custom-tools).

## SubmitTextPost [Permalink for this section](https://docs.arcade.dev/toolkits/social-communication/reddit\#submittextpost)

See Example >

Submit a text-based post to a subreddit

**Parameters**

- **`subreddit`** _(string, required)_ The name of the subreddit to which the post will be submitted.
- **`title`** _(string, required)_ The title of the submission.
- **`body`** _(string, optional)_ The body of the post in markdown format. Should never be the same as the title.
- **`nsfw`** _(boolean, optional)_ Indicates if the submission is NSFW. Default is `False`.
- **`spoiler`** _(boolean, optional)_ Indicates if the post is marked as a spoiler. Default is `False`.
- **`send_replies`** _(boolean, optional)_ If true, sends replies to the user’s inbox. Default is `True`.

* * *

## CommentOnPost [Permalink for this section](https://docs.arcade.dev/toolkits/social-communication/reddit\#commentonpost)

See Example >

Comment on a Reddit post.

**Parameters**

- **`post_identifier`** _(string, required)_ The identifier of the Reddit post. The identifier may be a Reddit URL, a permalink, a fullname, or a post id.
- **`text`** _(string, required)_ The body of the comment in markdown format.

* * *

## ReplyToComment [Permalink for this section](https://docs.arcade.dev/toolkits/social-communication/reddit\#replytocomment)

See Example >

Reply to a Reddit comment

**Parameters**

- **`comment_identifier`** _(string, required)_ The identifier of the Reddit comment to reply to. The identifier may be a comment ID, a Reddit URL to the comment, a permalink to the comment, or the fullname of the comment.
- **`text`** _(string, required)_ The body of the reply in markdown format.

* * *

## GetPostsInSubreddit [Permalink for this section](https://docs.arcade.dev/toolkits/social-communication/reddit\#getpostsinsubreddit)

See Example >

Gets posts titles, links, and other metadata in the specified subreddit.

The time\_range is required if the listing type is ‘top’ or ‘controversial’.

**Parameters**

- **`subreddit`** _(string, required)_ The name of the subreddit to fetch posts from.
- **`listing`** _(enum ( [SubredditListingType](https://docs.arcade.dev/toolkits/social-communication/reddit#subredditlistingtype)), optional)_ The type of listing to fetch. For simple listings such as ‘hot’, ‘new’, or ‘rising’, the time\_range parameter is ignored. For time-based listings such as ‘top’ or ‘controversial’, the ‘time\_range’ parameter is required. Default is ‘hot’.
- **`limit`** _(integer, optional)_ The maximum number of posts to fetch. Default is 10, max is 100.
- **`cursor`** _(str, optional)_ The pagination token from a previous call.
- **`time_range`** _(enum ( [RedditTimeFilter](https://docs.arcade.dev/toolkits/social-communication/reddit#reddittimefilter)), optional)_ The time range for filtering posts. Must be provided if the listing type is ‘top’ or ‘controversial’. Otherwise, it is ignored. Defaults to ‘today’.

* * *

## GetContentOfPost [Permalink for this section](https://docs.arcade.dev/toolkits/social-communication/reddit\#getcontentofpost)

See Example >

Get the content (body) of a Reddit post by its identifier.

**Parameters**

- **`post_identifier`** _(string, required)_ The identifier of the Reddit post. The identifier may be a Reddit URL, a permalink, a fullname, or a post id.

* * *

## GetContentOfMultiplePosts [Permalink for this section](https://docs.arcade.dev/toolkits/social-communication/reddit\#getcontentofmultipleposts)

See Example >

Get the content (body) of multiple Reddit posts by their identifiers in a single request

**Parameters**

- **`post_identifiers`** _(list of strings, required)_ A list of identifiers of the Reddit posts. The identifiers may be Reddit URLs, permalinks, fullnames, or post ids.

* * *

## GetTopLevelCommentsOfPost [Permalink for this section](https://docs.arcade.dev/toolkits/social-communication/reddit\#gettoplevelcommentsofpost)

See Example >

Get the first page of top-level comments of a Reddit post.

**Parameters**

- **`post_identifier`** _(string, required)_ The identifier of the Reddit post. The identifier may be a Reddit URL, a permalink, a fullname, or a post id.

* * *

## CheckSubredditAccess [Permalink for this section](https://docs.arcade.dev/toolkits/social-communication/reddit\#checksubredditaccess)

See Example >

Checks whether the specified subreddit exists and also if it is accessible to the authenticated user.

**Parameters**

- **`subreddit`** _(string, required)_ The name of the subreddit to check.

* * *

## GetSubredditRules [Permalink for this section](https://docs.arcade.dev/toolkits/social-communication/reddit\#getsubredditrules)

See Example >

Gets the rules of the specified subreddit

**Parameters**

- **`subreddit`** _(string, required)_ The name of the subreddit for which to fetch rules.

* * *

## GetMyUsername [Permalink for this section](https://docs.arcade.dev/toolkits/social-communication/reddit\#getmyusername)

See Example >

Gets the username of the authenticated user.

* * *

## GetMyPosts [Permalink for this section](https://docs.arcade.dev/toolkits/social-communication/reddit\#getmyposts)

See Example >

Get posts that were created by the authenticated user sorted by newest first

**Parameters**

- **`limit`** _(integer, optional)_ The maximum number of posts to fetch. Default is 10, max is 100.
- **`include_body`** _(boolean, optional)_ Whether to include the body of the posts in the response. Default is `True`.
- **`cursor`** _(str, optional)_ The pagination token from a previous call.

## Auth [Permalink for this section](https://docs.arcade.dev/toolkits/social-communication/reddit\#auth)

The Arcade Reddit toolkit uses the [Reddit auth provider](https://docs.arcade.dev/home/auth-providers/reddit) to connect to users’ Reddit accounts.

With the hosted Arcade Engine, there’s nothing to configure. Your users will see `Arcade` as the name of the application that’s requesting permission.

With a self-hosted installation of Arcade, you need to [configure the Reddit auth provider](https://docs.arcade.dev/home/auth-providers/reddit#configuring-reddit-auth) with your own Reddit app credentials.

## Reference [Permalink for this section](https://docs.arcade.dev/toolkits/social-communication/reddit\#reference)

### SubredditListingType [Permalink for this section](https://docs.arcade.dev/toolkits/social-communication/reddit\#subredditlistingtype)

The type of listing to fetch.

- **`HOT`** _(string: “hot”)_: The hottest posts in the subreddit.
- **`NEW`** _(string: “new”)_: The newest posts in the subreddit.
- **`RISING`** _(string: “rising”)_: The posts that are trending up in the subreddit.
- **`TOP`** _(string: “top”)_: The top posts in the subreddit (time-based).
- **`CONTROVERSIAL`** _(string: “controversial”)_: The posts that are currently controversial in the subreddit (time-based).

### RedditTimeFilter [Permalink for this section](https://docs.arcade.dev/toolkits/social-communication/reddit\#reddittimefilter)

The time range for filtering posts.

- **`NOW`** _(string: “NOW”)_
- **`TODAY`** _(string: “TODAY”)_
- **`THIS_WEEK`** _(string: “THIS\_WEEK”)_
- **`THIS_MONTH`** _(string: “THIS\_MONTH”)_
- **`THIS_YEAR`** _(string: “THIS\_YEAR”)_
- **`ALL_TIME`** _(string: “ALL\_TIME”)_

## Get Building

[Use tools hosted on Arcade Cloud\\
\\
Arcade tools are hosted by our cloud platform and ready to be used in your agents. Learn how.](https://docs.arcade.dev/home/quickstart)

[Self Host Arcade tools\\
\\
Arcade tools can be self-hosted on your own infrastructure. Learn more about self-hosting.\\
\\
```\\
pip install arcade_reddit\\
```](https://docs.arcade.dev/home/install/overview)

[Linkedin](https://docs.arcade.dev/toolkits/social-communication/linkedin "Linkedin") [Slack](https://docs.arcade.dev/toolkits/social-communication/slack "Slack")