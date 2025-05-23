---
url: "https://www.librechat.ai/docs/configuration/librechat_yaml/object_structure/actions"
title: "GitHub"
---

Docs

⚙️ Configuration

librechat.yaml

Settings

Actions

# Actions Object Structure

Actions can be used to dynamically create tools from OpenAPI specs. The `actions` object structure allows you to specify allowed domains for agent/assistant actions.

More info: [Agents - Actions](https://www.librechat.ai/docs/features/agents#actions)

## Example [Permalink for this section](https://www.librechat.ai/docs/configuration/librechat_yaml/object_structure/actions\#example)

Actions Object Structure

```nextra-code
# Example Actions Object Structure
actions:
  allowedDomains:
    - "swapi.dev"
    - "librechat.ai"
    - "google.com"
```

## allowedDomains [Permalink for this section](https://www.librechat.ai/docs/configuration/librechat_yaml/object_structure/actions\#alloweddomains)

**Key:**

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| allowedDomains | Array of Strings | A list specifying allowed domains for agent/assistant actions. | Actions with domains not listed will be restricted from executing. |

**Required**

**Example:**

actions / allowedDomains

```nextra-code
allowedDomains:
  - "swapi.dev"
  - "librechat.ai"
  - "google.com"
```

Last updated on April 27, 2025

[API Default Parameters](https://www.librechat.ai/docs/configuration/librechat_yaml/object_structure/default_params "API Default Parameters") [Ocr](https://www.librechat.ai/docs/configuration/librechat_yaml/object_structure/ocr "Ocr")