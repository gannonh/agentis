---
url: "https://www.librechat.ai/docs/configuration/librechat_yaml/ai_endpoints/deepseek"
title: "GitHub"
---

Docs

⚙️ Configuration

librechat.yaml

Custom AI Endpoints

Deepseek

# [Deepseek](https://www.deepseek.com/)

> Deepseek API key: [platform.deepseek.com](https://platform.deepseek.com/usage)

**Notes:**

- **Known:** icon provided.
- `deepseek-chat` and `deepseek-coder` are compatible with [Agents + tools](https://www.librechat.ai/docs/features/agents).
- `deepseek-reasoner`, codenamed “R1,” is supported and will stream its “thought process”; however, certain OpenAI API parameters may not be supported by this specific model.
- ”R1” may also be compatible with Agents when not using tools.
- `deepseek-chat` is preferred for title generation.

librechat.yaml

```nextra-code
    - name: "Deepseek"
      apiKey: "${DEEPSEEK_API_KEY}"
      baseURL: "https://api.deepseek.com/v1"
      models:
        default: ["deepseek-chat", "deepseek-coder", "deepseek-reasoner"]
        fetch: false
      titleConvo: true
      titleModel: "deepseek-chat"
      modelDisplayLabel: "Deepseek"
```

![Deepseek Generation](https://www.librechat.ai/_next/image?url=https%3A%2F%2Ffirebasestorage.googleapis.com%2Fv0%2Fb%2Fsuperb-reporter-407417.appspot.com%2Fo%2Fchrome_GsVGKQ8aF3.png%3Falt%3Dmedia%26token%3D30cde5cd-3b62-428a-bd24-b58afff0e4bb&w=1920&q=75)

Last updated on April 27, 2025

[Databricks](https://www.librechat.ai/docs/configuration/librechat_yaml/ai_endpoints/databricks "Databricks") [Fireworks](https://www.librechat.ai/docs/configuration/librechat_yaml/ai_endpoints/fireworks "Fireworks")