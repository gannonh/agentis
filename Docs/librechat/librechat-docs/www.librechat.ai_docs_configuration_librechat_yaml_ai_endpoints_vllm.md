---
url: "https://www.librechat.ai/docs/configuration/librechat_yaml/ai_endpoints/vllm"
title: "GitHub"
---

Docs

⚙️ Configuration

librechat.yaml

Custom AI Endpoints

vLLM

# [vLLM](https://github.com/vllm-project/vllm)

> vLLM is a high-throughput and memory-efficient inference and serving engine for LLMs.

**Notes:**

- **Not Known:** icon not provided, but fetching list of models is recommended to get available models from your local vLLM server.

- The `titleMessageRole` is important as some local LLMs will not accept system message roles for title messages (which is the default).

- This configuration assumes you have a vLLM server running locally at the specified baseURL.


```nextra-code
    - name: "vLLM"
      apiKey: "vllm"
      baseURL: "http://127.0.0.1:8023/v1"
      models:
        default: ['google/gemma-3-27b-it']
        fetch: true
      titleConvo: true
      titleModel: "current_model"
      titleMessageRole: "user"
      summarize: false
      summaryModel: "current_model"
      forcePrompt: false
```

The configuration above connects LibreChat to a local vLLM server running on port 8023. It uses the Gemma 3 27B model as the default model, but will fetch all available models from your vLLM server.

## Key Configuration Options [Permalink for this section](https://www.librechat.ai/docs/configuration/librechat_yaml/ai_endpoints/vllm\#key-configuration-options)

- `apiKey`: A simple placeholder value for vLLM (local deployments typically don’t require authentication)
- `baseURL`: The URL where your vLLM server is running
- `titleMessageRole`: Set to “user” instead of the default “system” as some local LLMs don’t support system messages

Last updated on May 8, 2025

[together.ai](https://www.librechat.ai/docs/configuration/librechat_yaml/ai_endpoints/togetherai "together.ai") [Vultr Cloud Inference](https://www.librechat.ai/docs/configuration/librechat_yaml/ai_endpoints/vultrcloudinference "Vultr Cloud Inference")