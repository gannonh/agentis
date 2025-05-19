---
url: "https://www.librechat.ai/docs/configuration/librechat_yaml/ai_endpoints/litellm"
title: "GitHub"
---

Docs

⚙️ Configuration

librechat.yaml

Custom AI Endpoints

LiteLLM

# [LiteLLM](https://docs.litellm.ai/docs/)

**Notes:**

- Reference [Using LibreChat with LiteLLM Proxy](https://www.librechat.ai/blog/2023-11-30_litellm) for configuration.

librechat.yaml

```nextra-code
    - name: "LiteLLM"
      apiKey: "sk-from-config-file"
      baseURL: "http://localhost:8000/v1"
      # if using LiteLLM example in docker-compose.override.yml.example, use "http://litellm:8000/v1"
      models:
        default: ["gpt-3.5-turbo"]
        fetch: true
      titleConvo: true
      titleModel: "gpt-3.5-turbo"
      summarize: false
      summaryModel: "gpt-3.5-turbo"
      forcePrompt: false
      modelDisplayLabel: "LiteLLM"
```

![image](https://github.com/danny-avila/LibreChat/assets/110412045/ddb4b2f3-608e-4034-9a27-3e94fc512034)

Last updated on April 27, 2025

[Huggingface](https://www.librechat.ai/docs/configuration/librechat_yaml/ai_endpoints/huggingface "Huggingface") [Mistral](https://www.librechat.ai/docs/configuration/librechat_yaml/ai_endpoints/mistral "Mistral")