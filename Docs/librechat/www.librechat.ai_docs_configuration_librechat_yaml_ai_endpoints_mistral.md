---
url: "https://www.librechat.ai/docs/configuration/librechat_yaml/ai_endpoints/mistral"
title: "GitHub"
---

Docs

⚙️ Configuration

librechat.yaml

Custom AI Endpoints

Mistral

# [Mistral AI](https://mistral.ai/)

> Mistral API key: [console.mistral.ai](https://console.mistral.ai/)

**Notes:**

- **Known:** icon provided, special handling of message roles: system message is only allowed at the top of the messages payload.

- API is strict with unrecognized parameters and errors are not descriptive (usually “no body”)
  - The use of [`dropParams`](https://www.librechat.ai/docs/configuration/librechat_yaml/object_structure/custom_endpoint#dropparams) to drop “user”, “frequency\_penalty”, “presence\_penalty” params is required.
  - `stop` is no longer included as a default parameter, so there is no longer a need to include it in [`dropParams`](https://www.librechat.ai/docs/configuration/librechat_yaml/object_structure/custom_endpoint#dropparams), unless you would like to completely prevent users from configuring this field.
- Allows fetching the models list, but be careful not to use embedding models for chat.


librechat.yaml

```nextra-code
    - name: "Mistral"
      apiKey: "${MISTRAL_API_KEY}"
      baseURL: "https://api.mistral.ai/v1"
      models:
        default: ["mistral-tiny", "mistral-small", "mistral-medium", "mistral -large-latest"]
        fetch: true
      titleConvo: true
      titleModel: "mistral-tiny"
      modelDisplayLabel: "Mistral"
      dropParams: ["stop", "user", "frequency_penalty", "presence_penalty"]
```

![image](https://github.com/danny-avila/LibreChat/assets/110412045/ddb4b2f3-608e-4034-9a27-3e94fc512034)

Last updated on April 27, 2025

[LiteLLM](https://www.librechat.ai/docs/configuration/librechat_yaml/ai_endpoints/litellm "LiteLLM") [Apple MLX](https://www.librechat.ai/docs/configuration/librechat_yaml/ai_endpoints/mlx "Apple MLX")