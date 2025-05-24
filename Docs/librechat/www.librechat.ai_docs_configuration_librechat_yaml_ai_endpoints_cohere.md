---
url: "https://www.librechat.ai/docs/configuration/librechat_yaml/ai_endpoints/cohere"
title: "GitHub"
---

Docs

⚙️ Configuration

librechat.yaml

Custom AI Endpoints

Cohere

# [Cohere](https://cohere.com/)

> Cohere API key: [dashboard.cohere.com](https://dashboard.cohere.com/)

**Notes:**

- **Known:** icon provided.
- Experimental: does not follow OpenAI-spec, uses a new method for endpoint compatibility, shares some similarities and parameters.
- For a full list of Cohere-specific parameters, see the [Cohere API documentation](https://docs.cohere.com/reference/chat).
- Note: The following parameters are recognized between OpenAI and Cohere. Most are removed in the example config below to prefer Cohere’s default settings:
  - `stop`: mapped to `stopSequences`
  - `top_p`: mapped to `p`, different min/max values
  - `frequency_penalty`: mapped to `frequencyPenalty`, different min/max values
  - `presence_penalty`: mapped to `presencePenalty`, different min/max values
  - `model`: shared, included by default.
  - `stream`: shared, included by default.
  - `max_tokens`: shared, mapped to `maxTokens`, not included by default.

librechat.yaml

```nextra-code
    - name: "cohere"
      apiKey: "${COHERE_API_KEY}"
      baseURL: "https://api.cohere.ai/v1"
      models:
        default: ["command-r","command-r-plus","command-light","command-light-nightly","command","command-nightly"]
        fetch: false
      modelDisplayLabel: "cohere"
      titleModel: "command"
      dropParams: ["stop", "user", "frequency_penalty", "presence_penalty", "temperature", "top_p"]
```

![image](https://github.com/danny-avila/LibreChat/assets/110412045/03549e00-243c-4539-ac9a-0d782af7cd6c)

Last updated on April 27, 2025

[APIpie](https://www.librechat.ai/docs/configuration/librechat_yaml/ai_endpoints/apipie "APIpie") [Databricks](https://www.librechat.ai/docs/configuration/librechat_yaml/ai_endpoints/databricks "Databricks")