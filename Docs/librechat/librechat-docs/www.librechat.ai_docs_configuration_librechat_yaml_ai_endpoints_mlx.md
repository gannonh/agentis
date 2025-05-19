---
url: "https://www.librechat.ai/docs/configuration/librechat_yaml/ai_endpoints/mlx"
title: "GitHub"
---

Docs

⚙️ Configuration

librechat.yaml

Custom AI Endpoints

Apple MLX

# [Apple MLX](https://github.com/ml-explore/mlx)

> [MLX OpenAI Compatibility](https://github.com/ml-explore/mlx-examples/blob/main/llms/mlx_lm/SERVER.md)

**Notes:**

- **Known:** icon provided.

- API is mostly strict with unrecognized parameters.

- Support only one model at a time, otherwise you’ll need to run a different endpoint with a different `baseURL`.


librechat.yaml

```nextra-code
    - name: "MLX"
      apiKey: "mlx"
      baseURL: "http://localhost:8080/v1/"
      models:
        default: [\
          "Meta-Llama-3-8B-Instruct-4bit"\
          ]
        fetch: false # fetching list of models is not supported
      titleConvo: true
      titleModel: "current_model"
      summarize: false
      summaryModel: "current_model"
      forcePrompt: false
      modelDisplayLabel: "Apple MLX"
      addParams:
            max_tokens: 2000
            "stop": [\
              "<|eot_id|>"\
            ]
```

![MLX](https://github.com/LibreChat-AI/librechat.ai/assets/32828263/e5765729-5ee4-4dbc-b553-df1684486a23)

Last updated on April 27, 2025

[Mistral](https://www.librechat.ai/docs/configuration/librechat_yaml/ai_endpoints/mistral "Mistral") [NeurochainAI](https://www.librechat.ai/docs/configuration/librechat_yaml/ai_endpoints/neurochain "NeurochainAI")