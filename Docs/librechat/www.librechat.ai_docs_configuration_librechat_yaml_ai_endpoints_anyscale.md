---
url: "https://www.librechat.ai/docs/configuration/librechat_yaml/ai_endpoints/anyscale"
title: "GitHub"
---

Docs

⚙️ Configuration

librechat.yaml

Custom AI Endpoints

Anyscale

# [Anyscale](https://app.endpoints.anyscale.com/)

> **Anyscale API key:** [anyscale.com/credentials](https://app.endpoints.anyscale.com/credentials)

**Notes:**

- **Known:** icon provided, fetching list of models is recommended.

librechat.yaml

```nextra-code
    - name: "Anyscale"
      apiKey: "${ANYSCALE_API_KEY}"
      baseURL: "https://api.endpoints.anyscale.com/v1"
      models:
        default: [\
          "meta-llama/Llama-2-7b-chat-hf",\
          ]
        fetch: true
      titleConvo: true
      titleModel: "meta-llama/Llama-2-7b-chat-hf"
      summarize: false
      summaryModel: "meta-llama/Llama-2-7b-chat-hf"
      forcePrompt: false
      modelDisplayLabel: "Anyscale"
```

![image](https://github.com/danny-avila/LibreChat/assets/32828263/9f2d8ad9-3f49-4fe3-a3ed-c85994c1c85f)

Last updated on April 27, 2025

[Intro](https://www.librechat.ai/docs/configuration/librechat_yaml/ai_endpoints "Intro") [APIpie](https://www.librechat.ai/docs/configuration/librechat_yaml/ai_endpoints/apipie "APIpie")