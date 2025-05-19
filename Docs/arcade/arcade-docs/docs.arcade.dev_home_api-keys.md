---
url: "https://docs.arcade.dev/home/api-keys"
title: "Arcade Docs"
---

[Home](https://docs.arcade.dev/home "Home") Get an API key

# Getting Your API Key

Before you begin, you’ll need an Arcade account - if you haven’t created one yet, you can [sign up here](https://api.arcade.dev/signup?utm_source=docs&utm_medium=page&utm_campaign=get-api-key). Once you have an account, you can generate API keys through either our dashboard or CLI.

DashboardCLI

### Using the Dashboard

### Navigate to API Keys page [Permalink for this section](https://docs.arcade.dev/home/api-keys\#navigate-to-api-keys-page)

Visit the [API Keys page](https://api.arcade.dev/dashboard/api-keys) in Arcade Dashboard.

### Create a new API key [Permalink for this section](https://docs.arcade.dev/home/api-keys\#create-a-new-api-key)

1. Click the `Create API Key` button in the top right
2. Enter a descriptive name to help identify your key
3. Click `Create API Key` to generate your key

### Save your API key securely [Permalink for this section](https://docs.arcade.dev/home/api-keys\#save-your-api-key-securely)

1. Copy your API key immediately - it will only be shown once
2. Store it securely
3. You can always generate new keys if needed

### Using the CLI

### Install and login [Permalink for this section](https://docs.arcade.dev/home/api-keys\#install-and-login)

1. Install the Arcade CLI:

```nextra-code
pip install arcade-ai
```

2. Start the login process:

```nextra-code
arcade login
```

### Complete setup [Permalink for this section](https://docs.arcade.dev/home/api-keys\#complete-setup)

The CLI will automatically:

- Print your API key to the console
- Save your credentials to `~/.arcade/credentials.yaml`

API keys are administrator credentials. Anyone who has your API key can make requests to Arcade as you. Always store your API keys in a safe place, such as system environment variables, and never commit them to version control, share them publicly, or use them in browser or frontend code.

## Next Steps [Permalink for this section](https://docs.arcade.dev/home/api-keys\#next-steps)

Once you have your API key, you can:

- [Start using tools](https://docs.arcade.dev/home/use-tools/call-tools-directly)
- [Create custom tools](https://docs.arcade.dev/home/custom-tools)

[Quickstart](https://docs.arcade.dev/home/quickstart "Quickstart") [Create a toolkit](https://docs.arcade.dev/home/build-tools/create-a-toolkit "Create a toolkit")