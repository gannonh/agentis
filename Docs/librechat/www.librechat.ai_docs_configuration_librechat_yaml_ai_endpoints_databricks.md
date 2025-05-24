---
url: "https://www.librechat.ai/docs/configuration/librechat_yaml/ai_endpoints/databricks"
title: "GitHub"
---

Docs

⚙️ Configuration

librechat.yaml

Custom AI Endpoints

Databricks

# [Databricks](https://www.databricks.com/)

> **\[Sign up for Databricks\]**( [https://www.databricks.com/try-databricks#account](https://www.databricks.com/try-databricks#account))

**Notes:**

- Since Databricks provides a full completions endpoint, ending with “invocations” for “serving-endpoints”, use of [directEndpoint](https://www.librechat.ai/docs/configuration/librechat_yaml/object_structure/custom_endpoint#directendpoint) setting is required.
- [titleMessageRole](https://www.librechat.ai/docs/configuration/librechat_yaml/object_structure/custom_endpoint#titlemessagerole) set to “user” is also required for title generation, as singular “system” messages are not supported.

librechat.yaml

```nextra-code
    - name: 'Databricks'
      apiKey: '${DATABRICKS_API_KEY}'
      baseURL: 'https://your_databricks_serving_endpoint_url_here_ending_with/invocations'
      models:
        default: [\
          "databricks-meta-llama-3-70b-instruct",\
        ]
        fetch: false
      titleConvo: true
      titleModel: 'current_model'
      directEndpoint: true # required
      titleMessageRole: 'user' # required
```

Last updated on April 27, 2025

[Cohere](https://www.librechat.ai/docs/configuration/librechat_yaml/ai_endpoints/cohere "Cohere") [Deepseek](https://www.librechat.ai/docs/configuration/librechat_yaml/ai_endpoints/deepseek "Deepseek")