---
url: "https://www.librechat.ai/docs/configuration/librechat_yaml"
title: "GitHub"
---

Docs

⚙️ Configuration

librechat.yaml

Intro

# Intro

Welcome to the guide for configuring the **librechat.yaml** file in LibreChat.

This file enables the integration of custom AI endpoints, enabling you to connect with any AI provider compliant with OpenAI API standards.

## Key Features [Permalink for this section](https://www.librechat.ai/docs/configuration/librechat_yaml\#key-features)

- **Endpoint Integration**: Seamlessly integrate with a variety of AI providers compliant with OpenAI API standards, including Mistral AI, reverse proxies, and more.
- **Advanced Customization**: Configure file handling, rate limiting, user registration, and interface elements to align with your preferences and requirements.
- **Model Specifications**: Define detailed model configurations, presets, and behaviors to deliver a tailored AI experience.
- **Agents**: Use Provider-agnostic, no-code assistants, with options to customize capabilities.
- **MCP Servers**: Integrate with the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/introduction) for tool integrations.
- **Assistants Integration**: Leverage the power of OpenAI’s Assistants API, with options to customize capabilities, polling intervals, and timeouts.
- **Azure OpenAI Support**: Integrate with Azure OpenAI Service, enabling access to multiple deployments, region models, and serverless inference endpoints.

![modelmenu-light](https://github.com/danny-avila/LibreChat/assets/32828263/26336fa4-db61-438b-929c-0004aa4db56c)

![modelmenu-dark](https://github.com/danny-avila/LibreChat/assets/32828263/1e2fe33b-7073-4b4e-9ee1-7b7a99704bad)

Future updates will streamline configuration further by migrating some settings from your [.env file](https://www.librechat.ai/docs/configuration/dotenv) to `librechat.yaml`.

Stay tuned for ongoing enhancements to customize your LibreChat instance!

**Note:** To verify your YAML config, you can use the [YAML Validator](https://www.librechat.ai/toolkit/yaml_checker) or other online tools like [yamlchecker.com](https://yamlchecker.com/)

Last updated on April 27, 2025

[Environment Variables](https://www.librechat.ai/docs/configuration/dotenv "Environment Variables") [Intro](https://www.librechat.ai/docs/configuration/librechat_yaml/ai_endpoints "Intro")