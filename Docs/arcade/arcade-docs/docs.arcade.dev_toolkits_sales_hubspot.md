---
url: "https://docs.arcade.dev/toolkits/sales/hubspot"
title: "Arcade Docs"
---

[Integrations](https://docs.arcade.dev/toolkits "Integrations") SalesHubspot

# Hubspot

**Description:** Enable agents to interact with the Hubspot CRM.

**Author:** Arcade

**Code:** [GitHub](https://github.com/ArcadeAI/arcade-ai/tree/main/toolkits/hubspot)

**Auth:** OAuth 2.0

[![PyPI Version](https://img.shields.io/pypi/v/arcade_hubspot)](https://pypi.org/project/arcade_hubspot/)[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/arcadeai/arcade-ai/blob/main/LICENSE)[![Python Versions](https://img.shields.io/pypi/pyversions/arcade_hubspot)](https://pypi.org/project/arcade_hubspot/)[![Wheel Status](https://img.shields.io/pypi/wheel/arcade_hubspot)](https://pypi.org/project/arcade_hubspot/)[![Downloads](https://img.shields.io/pypi/dm/arcade_hubspot)](https://pypi.org/project/arcade_hubspot/)

The Arcade Hubspot toolkit provides a pre-built set of tools for interacting with the Hubspot CRM. These tools make it easy to build agents and AI apps that can:

- Search and retrieve company data and associated objects (deals, calls, email messages, etc)
- Search and retrieve contact data and associated objects (calls, email messages, notes, tasks, etc)
- Create contacts

## Available Tools [Permalink for this section](https://docs.arcade.dev/toolkits/sales/hubspot\#available-tools)

| Tool Name | Description |
| --- | --- |
| GetCompanyDataByKeywords | Retrieve data about companies in Hubspot using full-text search. |
| GetContactDataByKeywords | Retrieve data about contacts in Hubspot using full-text search. |
| CreateContact | Create a contact in Hubspot. |

If you need to perform an action that’s not listed here, you can [get in touch\\
with us](mailto:contact@arcade.dev) to request a new tool, or [create your\\
own tools](https://docs.arcade.dev/home/build-tools/create-a-toolkit).

## GetCompanyDataByKeywords [Permalink for this section](https://docs.arcade.dev/toolkits/sales/hubspot\#getcompanydatabykeywords)

See Example >

Retrieve company data with associated contacts, deals, calls, emails, meetings, notes, and tasks.

**Parameters**

- **keywords** _(string, required)_ The keywords to search for companies. It will match against the company name, phone, and website.
- **limit** _(int, optional, Defaults to `10`)_ The maximum number of companies to return. Defaults to 10. Max is 10.
- **next\_page\_token** _(string, optional)_ The token to get the next page of results. Defaults to None (returns first page of results)

## GetContactDataByKeywords [Permalink for this section](https://docs.arcade.dev/toolkits/sales/hubspot\#getcontactdatabykeywords)

See Example >

Retrieve contact data with associated companies, deals, calls, emails, meetings, notes, and tasks.

**Parameters**

- **keywords** _(string, required)_ The keywords to search for. E.g. ‘quarterly report’
- **limit** _(int, optional, Defaults to `10`)_ The maximum number of contacts to return. Defaults to 10. Max is 10.
- **next\_page\_token** _(string, optional)_ The token to get the next page of results. Defaults to None (returns first page of results)

## CreateContact [Permalink for this section](https://docs.arcade.dev/toolkits/sales/hubspot\#createcontact)

See Example >

Create a contact associated with a company.

**Parameters**

- **company\_id** _(string, required)_ The ID of the company to create the contact for.
- **first\_name** _(string, required)_ The first name of the contact.
- **last\_name** _(string, optional)_ The last name of the contact.
- **email** _(string, optional)_ The email address of the contact.
- **phone** _(string, optional)_ The phone number of the contact.
- **mobile\_phone** _(string, optional)_ The mobile phone number of the contact.
- **job\_title** _(string, optional)_ The job title of the contact.

## Auth [Permalink for this section](https://docs.arcade.dev/toolkits/sales/hubspot\#auth)

The Arcade Hubspot toolkit uses the [Hubspot auth provider](https://docs.arcade.dev/home/auth-providers/hubspot) to connect to users’ Hubspot accounts.

### Arcade Cloud [Permalink for this section](https://docs.arcade.dev/toolkits/sales/hubspot\#arcade-cloud)

The Arcade Cloud offers a default Hubspot auth provider. If you use it, there’s nothing to configure. Your users will see `Arcade` as the name of the application requesting permission.

Alternatively, you can [configure a custom Hubspot auth provider](https://docs.arcade.dev/home/auth-providers/hubspot#use-your-own-hubspot-app-credentials) with your own Hubspot app credentials. This way, your users will see your application’s name requesting permission.

### Self-hosted Arcade Engine [Permalink for this section](https://docs.arcade.dev/toolkits/sales/hubspot\#self-hosted-arcade-engine)

With a [self-hosted installation of Arcade](https://docs.arcade.dev/home/install/local), you must [configure the Hubspot auth provider](https://docs.arcade.dev/home/auth-providers/hubspot) with your own Hubspot app credentials.

## Get Building

[Use tools hosted on Arcade Cloud\\
\\
Arcade tools are hosted by our cloud platform and ready to be used in your agents. Learn how.](https://docs.arcade.dev/home/quickstart)

[Self Host Arcade tools\\
\\
Arcade tools can be self-hosted on your own infrastructure. Learn more about self-hosting.\\
\\
```\\
pip install arcade_hubspot\\
```](https://docs.arcade.dev/home/install/overview)

[Youtube](https://docs.arcade.dev/toolkits/search/youtube "Youtube") [Contribute a toolkit](https://docs.arcade.dev/toolkits/contribute-a-toolkit "Contribute a toolkit")