---
url: "https://www.librechat.ai/docs/configuration/librechat_yaml/ai_endpoints/xai"
title: "GitHub"
---

Docs

⚙️ Configuration

librechat.yaml

Custom AI Endpoints

xAI

# [xAI](https://console.x.ai/)

> xAI API key: [x.ai](https://console.x.ai/)

**Notes:**

- **Known:** icon provided.

librechat.yaml

```nextra-code
    - name: "xai"
      apiKey: "${XAI_API_KEY}"
      baseURL: "https://api.x.ai/v1"
      models:
        default: ["grok-beta"]
        fetch: false
      titleConvo: true
      titleMethod: "completion"
      titleModel: "grok-beta"
      summarize: false
      summaryModel: "grok-beta"
      forcePrompt: false
      modelDisplayLabel: "Grok"
```

![image](https://github.com/user-attachments/assets/815173c4-489f-4944-b7bf-5602e4a6e8e8)

Last updated on April 27, 2025

[Vultr Cloud Inference](https://www.librechat.ai/docs/configuration/librechat_yaml/ai_endpoints/vultrcloudinference "Vultr Cloud Inference") [Setup](https://www.librechat.ai/docs/configuration/librechat_yaml/setup "Setup")