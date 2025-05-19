---
url: "https://www.librechat.ai/docs/configuration/librechat_yaml/ai_endpoints/vultrcloudinference"
title: "GitHub"
---

Docs

⚙️ Configuration

librechat.yaml

Custom AI Endpoints

Vultr Cloud Inference

# [Vultr Cloud Inference](https://my.vultr.com/inference/)

> Vultr Cloud Inference API key: Required - [Vultr Cloud Inference](https://docs.vultr.com/vultr-cloud-inference)

**Notes:**

- The example includes the 4 models optimized for chat, which was last updated on June 28, 2024, for your convenience.
- The only model currently supporting title generation is llama2-7b-chat-Q5\_K\_M.gguf.

librechat.yaml

```nextra-code
  custom:
    - name: 'Vultr Cloud Inference'
      apiKey: '${VULTRINFERENCE_TOKEN}'
      baseURL: 'https://api.vultrinference.com/v1/chat/completions'
      models:
        default: [\
          "llama2-7b-chat-Q5_K_M.gguf",\
          "llama2-13b-chat-Q5_K_M.gguf",\
          "mistral-7b-Q5_K_M.gguf",\
          "zephyr-7b-beta-Q5_K_M.gguf",\
        ]
        fetch: true
      titleConvo: true
      titleModel: "llama2-7b-chat-Q5_K_M.gguf"
      modelDisplayLabel: "Vultr Cloud Inference"
```

Last updated on April 27, 2025

[vLLM](https://www.librechat.ai/docs/configuration/librechat_yaml/ai_endpoints/vllm "vLLM") [xAI](https://www.librechat.ai/docs/configuration/librechat_yaml/ai_endpoints/xai "xAI")