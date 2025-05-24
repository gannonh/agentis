---
url: "https://www.librechat.ai/docs/configuration/librechat_yaml/ai_endpoints/neurochain"
title: "GitHub"
---

Docs

⚙️ Configuration

librechat.yaml

Custom AI Endpoints

NeurochainAI

# [NeurochainAI](https://neurochain.ai/)

> NeurochainAI API key: Required - [NeurochainAI REST API Documentation](https://app.neurochain.ai/network-integrations/rest-api)

**Notes:**

- Api is based on the OpenAI API.
- Model list is constantly growing and may not be up-to-date in this example. Keep an eye on the [NeurochainAI](https://neurochain.ai/) for the latest models.
- The example includes the NeurochainAI model: “Mistral-7B-OpenOrca-GPTQ”.

neurochainai.yaml

```nextra-code
    - name: "NeurochainAI"
      apiKey: "<=generated api key=>"
      baseURL: "https://ncmb.neurochain.io/v1/"
      models:
        default: [\
          "Mistral-7B-OpenOrca-GPTQ"\
        ]
        fetch: true
      titleConvo: true
      titleModel: "current_model"
      summarize: false
      summaryModel: "current_model"
      forcePrompt: false
      modelDisplayLabel: "NeurochainAI"
      iconURL: "https://raw.githubusercontent.com/LibreChat-AI/librechat-config-yaml/refs/heads/main/icons/NeurochainAI.png"
```

Last updated on April 27, 2025

[Apple MLX](https://www.librechat.ai/docs/configuration/librechat_yaml/ai_endpoints/mlx "Apple MLX") [Ollama](https://www.librechat.ai/docs/configuration/librechat_yaml/ai_endpoints/ollama "Ollama")