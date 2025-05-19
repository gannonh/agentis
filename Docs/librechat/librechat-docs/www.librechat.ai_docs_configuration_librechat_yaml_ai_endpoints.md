---
url: "https://www.librechat.ai/docs/configuration/librechat_yaml/ai_endpoints"
title: "GitHub"
---

Docs

⚙️ Configuration

librechat.yaml

Custom AI Endpoints

Intro

# Custom AI Endpoints

## Intro [Permalink for this section](https://www.librechat.ai/docs/configuration/librechat_yaml/ai_endpoints\#intro)

- This section lists known, compatible AI Endpoints, also known as “Custom Endpoints,” with example setups for the `librechat.yaml` file, also known as the [Custom Config](https://www.librechat.ai/docs/configuration/librechat_yaml) file.

- In all of the examples, arbitrary environment variable names are defined but you can use any name you wish, as well as changing the value to `user_provided` to allow users to submit their own API key from the web UI.


⚠️

Important: 'user\_provided' Key Setting

When setting API keys to “user\_provided”, this allows users to enter their own API keys through the web interface. This is different from the pre-configured endpoints in the .env file where you would set `ENDPOINT_KEY=user_provided` (e.g., `OPENAI_API_KEY=user_provided`).

For custom endpoints in librechat.yaml, you would use:

```nextra-code
endpoints:
  custom:
    - name: "Your Endpoint"
      apiKey: "user_provided"  # No need for ${} syntax here
```

For environment variables in the .env file, you would use:

```nextra-code
OPENAI_API_KEY=user_provided
```

- Some of the endpoints are marked as **Known,** which means they might have special handling and/or an icon already provided in the app for you.

### Notes [Permalink for this section](https://www.librechat.ai/docs/configuration/librechat_yaml/ai_endpoints\#notes)

- It’s recommended you follow the [Custom Endpoints Quick Start Guide](https://www.librechat.ai/docs/quick_start/custom_endpoints) before proceeding with the examples below.
- Important: make sure you setup the `librechat.yaml` file correctly: **[setup documentation](https://www.librechat.ai/docs/configuration/librechat_yaml/setup)**.

Last updated on April 27, 2025

[Intro](https://www.librechat.ai/docs/configuration/librechat_yaml "Intro") [Anyscale](https://www.librechat.ai/docs/configuration/librechat_yaml/ai_endpoints/anyscale "Anyscale")