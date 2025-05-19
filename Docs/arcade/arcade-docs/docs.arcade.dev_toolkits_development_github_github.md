---
url: "https://docs.arcade.dev/toolkits/development/github/github"
title: "Arcade Docs"
---

[Integrations](https://docs.arcade.dev/toolkits "Integrations") Developer ToolsGitHubGitHub

# GitHub

**Description:** Enable agents to interact with GitHub repositories, issues, and pull requests.

**Author:** Arcade

**Code:** [GitHub](https://github.com/ArcadeAI/arcade-ai/tree/main/toolkits/github)

**Auth:** User authorizationvia the [GitHub auth provider](https://docs.arcade.dev/home/auth-providers/github)

[![PyPI Version](https://img.shields.io/pypi/v/arcade_github)](https://pypi.org/project/arcade_github/)[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/arcadeai/arcade-ai/blob/main/LICENSE)[![Python Versions](https://img.shields.io/pypi/pyversions/arcade_github)](https://pypi.org/project/arcade_github/)[![Wheel Status](https://img.shields.io/pypi/wheel/arcade_github)](https://pypi.org/project/arcade_github/)[![Downloads](https://img.shields.io/pypi/dm/arcade_github)](https://pypi.org/project/arcade_github/)

The Arcade GitHub toolkit provides a pre-built set of tools for interacting with GitHub. These tools make it easy to build agents and AI apps that can:

- Access private repositories (with the user’s permission)
- Get info about repositories, issues, pull requests, and more
- Post issues, comments, and replies as the user

## Available Tools [Permalink for this section](https://docs.arcade.dev/toolkits/development/github/github\#available-tools)

These tools are currently available in the Arcade GitHub toolkit.

| Tool Name | Description |
| --- | --- |
| SetStarred | Star or unstar a GitHub repository. |
| ListStargazers | List the stargazers of a GitHub repository. |
| CreateIssue | Create an issue in a GitHub repository. |
| CreateIssueComment | Create a comment on an issue in a GitHub repository. |
| ListPullRequests | List pull requests in a GitHub repository. |
| GetPullRequest | Get details of a pull request in a GitHub repository. |
| UpdatePullRequest | Update a pull request in a GitHub repository. |
| ListPullRequestCommits | List commits on a pull request in a GitHub repository. |
| CreateReplyForReviewComment | Create a reply to a review comment on a pull request. |
| ListReviewCommentsOnPullRequest | List review comments on a pull request. |
| CreateReviewComment | Create a review comment on a pull request. |
| CountStargazers | Count the number of stargazers for a GitHub repository. |
| ListOrgRepositories | List repositories of a GitHub organization. |
| GetRepository | Get details of a GitHub repository. |
| ListRepositoryActivities | List activities of a GitHub repository. |
| ListReviewCommentsInARepository | List review comments in a repository. |

If you need to perform an action that’s not listed here, you can [get in touch\\
with us](mailto:contact@arcade.dev) to request a new tool, or [create your\\
own tools](https://docs.arcade.dev/home/build-tools/create-a-toolkit) with the [GitHub auth\\
provider](https://docs.arcade.dev/home/auth-providers/github#using-github-auth-in-customtools).

## SetStarred [Permalink for this section](https://docs.arcade.dev/toolkits/development/github/github\#setstarred)

See Example >

Star or unstar a GitHub repository.

**Parameters**

- **`owner`** _(string, required)_ The owner of the repository.
- **`name`** _(string, required)_ The name of the repository.
- **`starred`** _(boolean, required)_ Whether to star ( `true`) or unstar ( `false`) the repository.

* * *

## ListStargazers [Permalink for this section](https://docs.arcade.dev/toolkits/development/github/github\#liststargazers)

See Example >

List the stargazers of a GitHub repository.

**Parameters**

- **`owner`** _(string, required)_ The owner of the repository.
- **`repo`** _(string, required)_ The name of the repository.
- **`limit`** _(int, optional, Defaults to `None`)_ The maximum number of stargazers to return. If not provided, all stargazers will be returned.

* * *

## CreateIssue [Permalink for this section](https://docs.arcade.dev/toolkits/development/github/github\#createissue)

See Example >

Create an issue in a GitHub repository.

**Parameters**

- **`owner`** _(string, required)_ The account owner of the repository. The name is not case sensitive.
- **`repo`** _(string, required)_ The name of the repository without the .git extension. The name is not case sensitive.
- **`title`** _(string, required)_ The title of the issue.
- **`body`** _(string, optional)_ The contents of the issue.
- **`assignees`** _(array of strings, optional)_ Logins for Users to assign to this issue.
- **`milestone`** _(integer, optional)_ The number of the milestone to associate this issue with.
- **`labels`** _(array of strings, optional)_ Labels to associate with this issue.
- **`include_extra_data`** _(boolean, optional, Defaults to `false`)_ If true, return all the data available about the issue. This is a large payload and may impact performance - use with caution.

* * *

## CreateIssueComment [Permalink for this section](https://docs.arcade.dev/toolkits/development/github/github\#createissuecomment)

See Example >

Create a comment on an issue in a GitHub repository.

**Parameters**

- **`owner`** _(string, required)_ The account owner of the repository. The name is not case sensitive.
- **`repo`** _(string, required)_ The name of the repository without the .git extension. The name is not case sensitive.
- **`issue_number`** _(integer, required)_ The number that identifies the issue.
- **`body`** _(string, required)_ The contents of the comment.
- **`include_extra_data`** _(boolean, optional, Defaults to `false`)_ If true, return all the data available about the comment. This is a large payload and may impact performance - use with caution.

* * *

## ListPullRequests [Permalink for this section](https://docs.arcade.dev/toolkits/development/github/github\#listpullrequests)

See Example >

List pull requests in a GitHub repository.

**Parameters**

- **`owner`** _(string, required)_ The account owner of the repository. The name is not case sensitive.
- **`repo`** _(string, required)_ The name of the repository without the .git extension. The name is not case sensitive.
- **`state`** _(enum ( [PRState](https://docs.arcade.dev/toolkits/development/github/reference#prstate)), optional, Defaults to `PRState.OPEN`)_ The state of the pull requests to return.
- **`head`** _(string, optional)_ Filter pulls by head user or head organization and branch name in the format of user:ref-name or organization:ref-name.
- **`base`** _(string, optional, Defaults to `'main'`)_ Filter pulls by base branch name.
- **`sort`** _(enum ( [PRSortProperty](https://docs.arcade.dev/toolkits/development/github/reference#prsortproperty)), optional, Defaults to `PRSortProperty.CREATED`)_ The property to sort the results by.
- **`direction`** _(enum ( [SortDirection](https://docs.arcade.dev/toolkits/development/github/reference#sortdirection)), optional)_ The direction of the sort.
- **`per_page`** _(integer, optional, Defaults to `30`)_ The number of results per page (max 100).
- **`page`** _(integer, optional, Defaults to `1`)_ The page number of the results to fetch.
- **`include_extra_data`** _(boolean, optional, Defaults to `false`)_ If true, return all the data available about the pull requests. This is a large payload and may impact performance - use with caution.

* * *

## GetPullRequest [Permalink for this section](https://docs.arcade.dev/toolkits/development/github/github\#getpullrequest)

See Example >

Get details of a pull request in a GitHub repository.

**Parameters**

- **`owner`** _(string, required)_ The account owner of the repository. The name is not case sensitive.
- **`repo`** _(string, required)_ The name of the repository without the .git extension. The name is not case sensitive.
- **`pull_number`** _(integer, required)_ The number that identifies the pull request.
- **`include_diff_content`** _(boolean, optional, Defaults to `false`)_ If true, return the diff content of the pull request.
- **`include_extra_data`** _(boolean, optional, Defaults to `false`)_ If true, return all the data available about the pull requests. This is a large payload and may impact performance - use with caution.

* * *

## UpdatePullRequest [Permalink for this section](https://docs.arcade.dev/toolkits/development/github/github\#updatepullrequest)

See Example >

Update a pull request in a GitHub repository.

**Parameters**

- **`owner`** _(string, required)_ The account owner of the repository. The name is not case sensitive.
- **`repo`** _(string, required)_ The name of the repository without the .git extension. The name is not case sensitive.
- **`pull_number`** _(integer, required)_ The number that identifies the pull request.
- **`title`** _(string, optional)_ The title of the pull request.
- **`body`** _(string, optional)_ The contents of the pull request.
- **`state`** _(enum ( [PRState](https://docs.arcade.dev/toolkits/development/github/reference#prstate)), optional)_ State of this Pull Request. Either open or closed.
- **`base`** _(string, optional)_ The name of the branch you want your changes pulled into.
- **`maintainer_can_modify`** _(boolean, optional)_ Indicates whether maintainers can modify the pull request.

* * *

## ListPullRequestCommits [Permalink for this section](https://docs.arcade.dev/toolkits/development/github/github\#listpullrequestcommits)

See Example >

List commits (from oldest to newest) on a pull request in a GitHub repository.

**Parameters**

- **`owner`** _(string, required)_ The account owner of the repository. The name is not case sensitive.
- **`repo`** _(string, required)_ The name of the repository without the .git extension. The name is not case sensitive.
- **`pull_number`** _(integer, required)_ The number that identifies the pull request.
- **`per_page`** _(integer, optional, Defaults to `30`)_ The number of results per page (max 100).
- **`page`** _(integer, optional, Defaults to `1`)_ The page number of the results to fetch.
- **`include_extra_data`** _(boolean, optional, Defaults to `false`)_ If true, return all the data available about the pull requests. This is a large payload and may impact performance - use with caution.

* * *

## CreateReplyForReviewComment [Permalink for this section](https://docs.arcade.dev/toolkits/development/github/github\#createreplyforreviewcomment)

See Example >

Create a reply to a review comment for a pull request in a GitHub repository.

**Parameters**

- **`owner`** _(string, required)_ The account owner of the repository. The name is not case sensitive.
- **`repo`** _(string, required)_ The name of the repository without the .git extension. The name is not case sensitive.
- **`pull_number`** _(integer, required)_ The number that identifies the pull request.
- **`comment_id`** _(integer, required)_ The unique identifier of the comment to reply to.
- **`body`** _(string, required)_ The text of the reply comment.

* * *

## ListReviewCommentsOnPullRequest [Permalink for this section](https://docs.arcade.dev/toolkits/development/github/github\#listreviewcommentsonpullrequest)

See Example >

List review comments on a pull request in a GitHub repository.

**Parameters**

- **`owner`** _(string, required)_ The account owner of the repository. The name is not case sensitive.
- **`repo`** _(string, required)_ The name of the repository without the .git extension. The name is not case sensitive.
- **`pull_number`** _(integer, required)_ The number that identifies the pull request.
- **`sort`** _(enum ( [ReviewCommentSortProperty](https://docs.arcade.dev/toolkits/development/github/reference#reviewcommentsortproperty)), optional, Defaults to `'created'`)_ The property to sort the results by. Can be one of: `created`, `updated`.
- **`direction`** _(enum ( [SortDirection](https://docs.arcade.dev/toolkits/development/github/reference#sortdirection)), optional, Defaults to `'desc'`)_ The direction to sort results. Can be one of: `asc`, `desc`.
- **`since`** _(string, optional)_ Only show results that were last updated after the given time. This is a timestamp in ISO 8601 format: YYYY-MM-DDTHH:MM:SSZ.
- **`per_page`** _(integer, optional, Defaults to `30`)_ The number of results per page (max 100).
- **`page`** _(integer, optional, Defaults to `1`)_ The page number of the results to fetch.
- **`include_extra_data`** _(boolean, optional, Defaults to `false`)_ If true, return all the data available about the pull requests. This is a large payload and may impact performance - use with caution.

* * *

## CreateReviewComment [Permalink for this section](https://docs.arcade.dev/toolkits/development/github/github\#createreviewcomment)

See Example >

Create a review comment for a pull request in a GitHub repository.

If the subject\_type is not ‘file’, then the start\_line and end\_line parameters are required. If the subject\_type is ‘file’, then the start\_line and end\_line parameters are ignored. If the commit\_id is not provided, the latest commit SHA of the PR’s base branch will be used.

**Parameters**

- **`owner`** _(string, required)_ The account owner of the repository. The name is not case sensitive.
- **`repo`** _(string, required)_ The name of the repository without the .git extension. The name is not case sensitive.
- **`pull_number`** _(integer, required)_ The number that identifies the pull request.
- **`body`** _(string, required)_ The text of the review comment.
- **`path`** _(string, required)_ The relative path to the file that necessitates a comment.
- **`commit_id`** _(string, optional)_ The SHA of the commit needing a comment. If not provided, the latest commit SHA of the PR’s base branch will be used.
- **`start_line`** _(integer, optional)_ The start line of the range of lines in the pull request diff that the comment applies to. Required unless ‘subject\_type’ is ‘file’.
- **`end_line`** _(integer, optional)_ The end line of the range of lines in the pull request diff that the comment applies to. Required unless ‘subject\_type’ is ‘file’.
- **`side`** _(enum ( [DiffSide](https://docs.arcade.dev/toolkits/development/github/reference#diffside)), optional, Defaults to `'RIGHT'`)_ The side of the diff that the pull request’s changes appear on. Use LEFT for deletions that appear in red. Use RIGHT for additions that appear in green or unchanged lines that appear in white and are shown for context.
- **`start_side`** _(string, optional)_ The starting side of the diff that the comment applies to.
- **`subject_type`** _(enum ( [ReviewCommentSubjectType](https://docs.arcade.dev/toolkits/development/github/reference#reviewcommentsubjecttype)), optional, Defaults to `'FILE'`)_ The type of subject that the comment applies to. Can be one of: file, hunk, or line.
- **`include_extra_data`** _(boolean, optional, Defaults to `false`)_ If true, return all the data available about the review comment. This is a large payload and may impact performance - use with caution.

* * *

## CountStargazers [Permalink for this section](https://docs.arcade.dev/toolkits/development/github/github\#countstargazers)

See Example >

Count the number of stargazers (stars) for a GitHub repository.

**Parameters**

- **`owner`** _(string, required)_ The owner of the repository.
- **`name`** _(string, required)_ The name of the repository.

* * *

## ListOrgRepositories [Permalink for this section](https://docs.arcade.dev/toolkits/development/github/github\#listorgrepositories)

See Example >

List repositories for the specified GitHub organization.

**Parameters**

- **`org`** _(string, required)_ The organization name. The name is not case sensitive.
- **`repo_type`** _(enum ( [RepoType](https://docs.arcade.dev/toolkits/development/github/reference#repotype)), optional, Defaults to `'ALL'`)_ The types of repositories to return.
- **`sort`** _(enum ( [RepoSortProperty](https://docs.arcade.dev/toolkits/development/github/reference#reposortproperty)), optional, Defaults to `'CREATED'`)_ The property to sort the results by.
- **`sort_direction`** _(enum ( [SortDirection](https://docs.arcade.dev/toolkits/development/github/reference#sortdirection)), optional, Defaults to `'ASC'`)_ The order to sort by.
- **`per_page`** _(integer, optional, Defaults to `30`)_ The number of results per page.
- **`page`** _(integer, optional, Defaults to `1`)_ The page number of the results to fetch.
- **`include_extra_data`** _(boolean, optional, Defaults to `false`)_ If true, return all the data available about the repositories. This is a large payload and may impact performance - use with caution.

* * *

## GetRepository [Permalink for this section](https://docs.arcade.dev/toolkits/development/github/github\#getrepository)

See Example >

Get detailed information about a GitHub repository.

**Parameters**

- **`owner`** _(string, required)_ The account owner of the repository. The name is not case sensitive.
- **`repo`** _(string, required)_ The name of the repository without the .git extension. The name is not case sensitive.
- **`include_extra_data`** _(boolean, optional, Defaults to `false`)_ If true, return all the data available about the repository. This is a large payload and may impact performance - use with caution.

* * *

## ListRepositoryActivities [Permalink for this section](https://docs.arcade.dev/toolkits/development/github/github\#listrepositoryactivities)

See Example >

List repository activities such as pushes, merges, force pushes, and branch changes. Retrieves a detailed history of changes to a repository, such as pushes, merges, force pushes, and branch changes,and associates these changes with commits and users.

**Parameters**

- **`owner`** _(string, required)_ The account owner of the repository. The name is not case sensitive.
- **`repo`** _(string, required)_ The name of the repository without the .git extension. The name is not case sensitive.
- **`direction`** _(enum ( [SortDirection](https://docs.arcade.dev/toolkits/development/github/reference#sortdirection)), optional, Defaults to `'DESC'`)_ The direction to sort the results by.
- **`per_page`** _(integer, optional, Defaults to `30`)_ The number of results per page (max 100).
- **`before`** _(string, optional)_ A cursor (unique identifier, e.g., a SHA of a commit) to search for results before this cursor.
- **`after`** _(string, optional)_ A cursor (unique identifier, e.g., a SHA of a commit) to search for results after this cursor.
- **`ref`** _(string, optional)_ The Git reference for the activities you want to list. Can be formatted as `refs/heads/BRANCH_NAME` or just `BRANCH_NAME`.
- **`actor`** _(string, optional)_ The GitHub username to filter by the actor who performed the activity.
- **`time_period`** _(enum ( [RepoTimePeriod](https://docs.arcade.dev/toolkits/development/github/reference#repotimeperiod)), optional)_ The time period to filter by.
- **`activity_type`** _(enum ( [ActivityType](https://docs.arcade.dev/toolkits/development/github/reference#activitytype)), optional)_ The activity type to filter by.
- **`include_extra_data`** _(boolean, optional, Defaults to `false`)_ If true, return all the data available about the activities. This is a large payload and may impact performance - use with caution.

* * *

## ListReviewCommentsInARepository [Permalink for this section](https://docs.arcade.dev/toolkits/development/github/github\#listreviewcommentsinarepository)

See Example >

List review comments in a GitHub repository.

**Parameters**

- **`owner`** _(string, required)_ The account owner of the repository. The name is not case sensitive.
- **`repo`** _(string, required)_ The name of the repository without the .git extension. The name is not case sensitive.
- **`sort`** _(enum ( [ReviewCommentSortProperty](https://docs.arcade.dev/toolkits/development/github/reference#reviewcommentsortproperty)), optional, Defaults to `'created'`)_ The property to sort the results by. Can be one of: created, updated.
- **`direction`** _(enum ( [SortDirection](https://docs.arcade.dev/toolkits/development/github/reference#sortdirection)), optional, Defaults to `'DESC'`)_ The direction to sort results. Ignored without sort parameter. Can be one of: asc, desc.
- **`since`** _(string, optional)_ Only show results that were last updated after the given time. This is a timestamp in ISO 8601 format: YYYY-MM-DDTHH:MM:SSZ.
- **`per_page`** _(integer, optional, Defaults to `30`)_ The number of results per page (max 100).
- **`page`** _(integer, optional, Defaults to `1`)_ The page number of the results to fetch.
- **`include_extra_data`** _(boolean, optional, Defaults to `false`)_ If true, return all the data available about the pull requests. This is a large payload and may impact performance - use with caution.

* * *

## Auth [Permalink for this section](https://docs.arcade.dev/toolkits/development/github/github\#auth)

The Arcade GitHub toolkit uses the [GitHub auth provider](https://docs.arcade.dev/home/auth-providers/github) to connect to users’ GitHub accounts.

With the hosted Arcade Engine, there’s nothing to configure. Your users will see `Arcade` as the name of the application that’s requesting permission.

With a self-hosted installation of Arcade, you need to [configure the GitHub auth provider](https://docs.arcade.dev/home/auth-providers/github#configuring-github-auth) with your own GitHub app credentials.

## Get Building

[Use tools hosted on Arcade Cloud\\
\\
Arcade tools are hosted by our cloud platform and ready to be used in your agents. Learn how.](https://docs.arcade.dev/home/quickstart)

[Self Host Arcade tools\\
\\
Arcade tools can be self-hosted on your own infrastructure. Learn more about self-hosting.\\
\\
```\\
pip install arcade_github\\
```](https://docs.arcade.dev/home/install/overview)

[Twitch](https://docs.arcade.dev/toolkits/entertainment/twitch "Twitch") [Reference](https://docs.arcade.dev/toolkits/development/github/reference "Reference")