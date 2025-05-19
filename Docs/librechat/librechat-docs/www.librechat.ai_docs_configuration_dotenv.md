---
url: "https://www.librechat.ai/docs/configuration/dotenv"
title: "GitHub"
---

Docs

⚙️ Configuration

Environment Variables

# .env File Configuration

Welcome to the comprehensive guide for configuring your application’s environment with the `.env` file. This document is your one-stop resource for understanding and customizing the environment variables that will shape your application’s behavior in different contexts.

While the default settings provide a solid foundation for a standard `docker` installation, delving into this guide will unveil the full potential of LibreChat. This guide empowers you to tailor LibreChat to your precise needs. Discover how to adjust language model availability, integrate social logins, manage the automatic moderation system, and much more. It’s all about giving you the control to fine-tune LibreChat for an optimal user experience.

> **Reminder: Please restart LibreChat for the configuration changes to take effect**

Alternatively, you can create a new file named `docker-compose.override.yml` in the same directory as your main `docker-compose.yml` file for LibreChat, where you can set your .env variables as needed under `environment`, or modify the default configuration provided by the main `docker-compose.yml`, without the need to directly edit or duplicate the whole file.

For more info see:

- Our quick guide:
  - **[Docker Override](https://www.librechat.ai/docs/configuration/docker_override)**
- The official docker documentation:
  - **[docker docs - understanding-multiple-compose-files](https://docs.docker.com/compose/multiple-compose-files/extends/#understanding-multiple-compose-files)**
  - **[docker docs - merge-compose-files](https://docs.docker.com/compose/multiple-compose-files/merge/#merge-compose-files)**
  - **[docker docs - specifying-multiple-compose-files](https://docs.docker.com/compose/reference/#specifying-multiple-compose-files)**
- You can also view an example of an override file for LibreChat in your LibreChat folder and on GitHub:
  - **[docker-compose.override.example](https://github.com/danny-avila/LibreChat/blob/main/docker-compose.override.yml.example)**

* * *

## Server Configuration [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#server-configuration)

### Port [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#port)

- The server listens on a specific port.
- The `PORT` environment variable sets the port where the server listens. By default, it is set to `3080`.

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| HOST | string | Specifies the host. | HOST=localhost |
| PORT | number | Specifies the port. | PORT=3080 |

### Trust proxy [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#trust-proxy)

Use the address that is at most n number of hops away from the Express application.
req.socket.remoteAddress is the first hop, and the rest are looked for in the X-Forwarded-For header from right to left.
A value of 0 means that the first untrusted address would be req.socket.remoteAddress, i.e. there is no reverse proxy.
The `TRUST_PROXY` environment variable default is set to `1`.

Refer to [Express.js - trust proxy](https://expressjs.com/en/guide/behind-proxies.html) for more information about this.

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| TRUST\_PROXY | number | Specifies the number of hops. | HOST=1 |

### Credentials Configuration [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#credentials-configuration)

To securely store credentials, you need a fixed key and IV. You can set them here for prod and dev environments.

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| CREDS\_KEY | string | 32-byte key (64 characters in hex) for securely storing credentials. Required for app startup. | CREDS\_KEY=f34be427ebb29de8d88c107a71546019685ed8b241d8f2ed00c3df97ad2566f0 |
| CREDS\_IV | string | 16-byte IV (32 characters in hex) for securely storing credentials. Required for app startup. | CREDS\_IV=e2341419ec3dd3d19b13a1a87fafcbfb |

⚠️

Warning

**Warning:** If you don’t set `CREDS_KEY` and `CREDS_IV`, the app will crash on startup.

- You can use this [Key Generator](https://www.librechat.ai/toolkit/creds_generator) to generate them quickly.

### Static File Handling [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#static-file-handling)

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| STATIC\_CACHE\_MAX\_AGE | string | Cache-Control max-age in seconds | STATIC\_CACHE\_MAX\_AGE=172800 |
| STATIC\_CACHE\_S\_MAX\_AGE | string | Cache-Control s-maxage in seconds for shared caches (CDNs and proxies) | STATIC\_CACHE\_S\_MAX\_AGE="86400" |
| DISABLE\_COMPRESSION | boolean | Disables compression for static files. | DISABLE\_COMPRESSION=false |

**Behaviour:**

Sets the [Cache-Control](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control) headers for static files. These configurations only trigger when the `NODE_ENV` is set to `production`.

- Uncomment `STATIC_CACHE_MAX_AGE` to change the local `max-age` for static files. By default this is set to 2 days (172800 seconds).
- Uncomment `STATIC_CACHE_S_MAX_AGE` to set the `s-maxage` for shared caches (CDNs and proxies). By default this is set to 1 day (86400 seconds).
- Uncomment `DISABLE_COMPRESSION` to disable compression for static files. By default, compression is enabled.

⚠️

Warning

- This only affects static files served by the API server and is not applicable to _Firebase_, _NGINX_, or any other configurations.

### Index HTML Cache Control [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#index-html-cache-control)

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| INDEX\_HTML\_CACHE\_CONTROL | string | Cache-Control header for index.html | INDEX\_HTML\_CACHE\_CONTROL=no-cache, no-store, must-revalidate |
| INDEX\_HTML\_PRAGMA | string | Pragma header for index.html | INDEX\_HTML\_PRAGMA=no-cache |
| INDEX\_HTML\_EXPIRES | string | Expires header for index.html | INDEX\_HTML\_EXPIRES=0 |

**Behaviour:**

Controls caching headers specifically for the index.html response. By default, these settings prevent caching to ensure users always get the latest version of the application.

✏️

Note

Unlike static assets which are cached for performance, the index.html file’s cache headers are configured separately to ensure users always get the latest application shell.

### MongoDB Database [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#mongodb-database)

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| MONGO\_URI | string | Specifies the MongoDB URI. | MONGO\_URI=mongodb://127.0.0.1:27017/LibreChat |

Change this to your MongoDB URI if different. You should add `LibreChat` or your own `APP_TITLE` as the database name in the URI.

If you are using an online database, the URI format is `mongodb+srv://<username>:<password>@<host>/<database>?<options>`. Your `MONGO_URI` should look like this:

- `mongodb+srv://username:password@host.mongodb.net/LibreChat?retryWrites=true` ( `retryWrites` is the only option you need when using the online database.)

Alternatively you can use `documentDb` that emulates `mongoDb` but it:

- does not support `retryWrites` \- use `retryWrites=false`
- requires TLS connection, hence use parameters `tls=true` to enable TLS and `tlsCAFile=/path-to-ca/bundle.pem` to point to the AWS provided CA bundle file

The URI for `documentDb` will look like:

- `mongodb+srv://username:password@domain/dbname?retryWrites=false&tls=true&tlsCAFile=/path-to-ca/bundle.pem`

See also:

- [MongoDB Atlas](https://www.librechat.ai/docs/configuration/mongodb/mongodb_atlas) for instructions on how to create an online MongoDB Atlas database (useful for use without Docker)
- [MongoDB Community Server](https://www.librechat.ai/docs/configuration/mongodb/mongodb_community) for instructions on how to create a local MongoDB database (without Docker)
- [MongoDB Authentication](https://www.librechat.ai/docs/configuration/mongodb/mongodb_auth) To enable explicit authentication for MongoDB in Docker.
- [Manage your database with Mongo Express](https://www.librechat.ai/blog/2023-11-30_mongoexpress) for securely accessing your Docker MongoDB database

### Application Domains [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#application-domains)

To configure LibreChat for local use or custom domain deployment, set the following environment variables:

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| DOMAIN\_CLIENT | string | Specifies the client-side domain. | DOMAIN\_CLIENT=http://localhost:3080 |
| DOMAIN\_SERVER | string | Specifies the server-side domain. | DOMAIN\_SERVER=http://localhost:3080 |

When deploying LibreChat to a custom domain, replace `http://localhost:3080` with your deployed URL

- e.g. `https://librechat.example.com`.

### Prevent Public Search Engines Indexing [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#prevent-public-search-engines-indexing)

By default, your website will not be indexed by public search engines (e.g. Google, Bing, …). This means that people will not be able to find your website through these search engines. If you want to make your website more visible and searchable, you can change the following setting to `false`

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| NO\_INDEX | boolean | Prevents public search engines from indexing your website. | NO\_INDEX=true |

❗ **Note:** This method is not guaranteed to work for all search engines, and some search engines may still index your website or web page for other purposes, such as caching or archiving. Therefore, you should not rely solely on this method to protect sensitive or confidential information on your website or web page.

### Logging [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#logging)

LibreChat has built-in central logging, see [Logging System](https://www.librechat.ai/docs/configuration/logging) for more info.

#### Log Files [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#log-files)

- Debug logging is enabled by default and crucial for development.
- To report issues, reproduce the error and submit logs from `./api/logs/debug-%DATE%.log` at: **[LibreChat GitHub Issues](https://github.com/danny-avila/LibreChat/issues)**
- Error logs are stored in the same location.

#### Environment Variables [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#environment-variables)

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| DEBUG\_LOGGING | boolean | Keep debug logs active. | DEBUG\_LOGGING=true |
| DEBUG\_CONSOLE | boolean | Enable verbose console/stdout logs in the same format as file debug logs. | DEBUG\_CONSOLE=false |
| CONSOLE\_JSON | boolean | Enable verbose JSON console/stdout logs suitable for cloud deployments like GCP/AWS. | CONSOLE\_JSON=false |
| CONSOLE\_JSON\_STRING\_LENGTH | number | Configure the truncation size for console/stdout logs, defaults to 255 | CONSOLE\_JSON\_STRING\_LENGTH=1000 |

Note:

- `DEBUG_LOGGING` can be used with either `DEBUG_CONSOLE` or `CONSOLE_JSON` but not both.
- `DEBUG_CONSOLE` and `CONSOLE_JSON` are mutually exclusive.
- `CONSOLE_JSON`: When handling console logs in cloud deployments (such as GCP or AWS), enabling this will dump the logs with a UTC timestamp and format them as JSON.
  - See: [feat: Add CONSOLE\_JSON](https://github.com/danny-avila/LibreChat/pull/2146)

Note: `DEBUG_CONSOLE` is not recommended, as the outputs can be quite verbose, and so it’s disabled by default.

### Permission [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#permission)

> UID and GID are numbers assigned by Linux to each user and group on the system. If you have permission problems, set here the UID and GID of the user running the Docker Compose command. The applications in the container will run with these UID/GID.

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| UID | number | The user ID. | \# UID=1000 |
| GID | number | The group ID. | \# GID=1000 |

### Configuration Path - `librechat.yaml` [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#configuration-path---librechatyaml)

Specify an alternative location for the LibreChat configuration file.
You may specify an **absolute path**, a **relative path**, or a **URL**. The filename in the path is flexible and does not have to be `librechat.yaml`; any valid configuration file will work.

> **Note**: If you prefer LibreChat to search for the configuration file in the root directory (which is the default behavior), simply leave this option commented out.

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| CONFIG\_PATH | string | An alternative location for the LibreChat configuration file. | \# CONFIG\_PATH=https://raw.githubusercontent.com/danny-avila/LibreChat/main/librechat.example.yaml |

## Endpoints [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#endpoints)

In this section, you can configure the endpoints and models selection, their API keys, and the proxy and reverse proxy settings for the endpoints that support it.

### General Config [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#general-config)

Uncomment `ENDPOINTS` to customize the available endpoints in LibreChat.

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| ENDPOINTS | string | Comma-separated list of available endpoints. | \# ENDPOINTS=openAI,agents,assistants,gptPlugins,azureOpenAI,google,anthropic,bingAI,custom |
| PROXY | string | Proxy setting for all endpoints. | PROXY= |
| TITLE\_CONVO | boolean | Enable titling for all endpoints. | TITLE\_CONVO=true |

### Known Endpoints - `librechat.yaml` [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#known-endpoints---librechatyaml)

- see also: [Custom Endpoints & Configuration](https://www.librechat.ai/docs/configuration/librechat_yaml)

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| ANYSCALE\_API\_KEY | string | API key for Anyscale. | \# ANYSCALE\_API\_KEY= |
| APIPIE\_API\_KEY | string | API key for Apipie. | \# APIPIE\_API\_KEY= |
| COHERE\_API\_KEY | string | API key for Cohere. | \# COHERE\_API\_KEY= |
| FIREWORKS\_API\_KEY | string | API key for Fireworks. | \# FIREWORKS\_API\_KEY= |
| GROQ\_API\_KEY | string | API key for Groq. | \# GROQ\_API\_KEY= |
| MISTRAL\_API\_KEY | string | API key for Mistral. | \# MISTRAL\_API\_KEY= |
| OPENROUTER\_KEY | string | API key for OpenRouter. | \# OPENROUTER\_KEY= |
| PERPLEXITY\_API\_KEY | string | API key for Perplexity. | \# PERPLEXITY\_API\_KEY= |
| SHUTTLEAI\_API\_KEY | string | API key for ShuttleAI. | \# SHUTTLEAI\_API\_KEY= |
| TOGETHERAI\_API\_KEY | string | API key for TogetherAI. | \# TOGETHERAI\_API\_KEY= |
| DEEPSEEK\_API\_KEY | string | API key for Deepseek API | \# DEEPSEEK\_API\_KEY= |

### Anthropic [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#anthropic)

see: [Anthropic Endpoint](https://www.librechat.ai/docs/configuration/ai_setup#anthropic)

- You can request an access key from [https://console.anthropic.com/](https://console.anthropic.com/)
- Leave `ANTHROPIC_API_KEY=` blank to disable this endpoint
- Set `ANTHROPIC_API_KEY=` to “user\_provided” to allow users to provide their own API key from the WebUI
- If you have access to a reverse proxy for `Anthropic`, you can set it with `ANTHROPIC_REVERSE_PROXY=`
  - leave blank or comment it out to use default base url

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| ANTHROPIC\_API\_KEY | string | Anthropic API key or "user\_provided" to allow users to provide their own API key. | Defaults to an empty string. |
| ANTHROPIC\_MODELS | string | Comma-separated list of Anthropic models to use. | \# ANTHROPIC\_MODELS=claude-3-opus-20240229,claude-3-sonnet-20240229,claude-3-haiku-20240307,claude-2.1,claude-2,claude-1.2,claude-1,claude-1-100k,claude-instant-1,claude-instant-1-100k |
| ANTHROPIC\_REVERSE\_PROXY | string | Reverse proxy for Anthropic. | \# ANTHROPIC\_REVERSE\_PROXY= |
| ANTHROPIC\_TITLE\_MODEL | string | DEPRECATED: Model to use for titling with Anthropic. | \# ANTHROPIC\_TITLE\_MODEL=claude-3-haiku-20240307 |

- `ANTHROPIC_TITLE_MODEL` is now deprecated and will be removed in future versions. Use the [`titleModel` Endpoint Setting](https://www.librechat.ai/docs/configuration/librechat_yaml/object_structure/shared_endpoint_settings#titlemodel) instead in the `librechat.yaml` config instead.

> **Note:** Must be compatible with the Anthropic Endpoint. Also, Claude 2 and Claude 3 models perform best at this task, with `claude-3-haiku` models being the cheapest.

### BingAI [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#bingai)

Bing, also used for Sydney, jailbreak, and Bing Image Creator

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| BINGAI\_TOKEN | string | Bing access token. Leave blank to disable. Can be set to "user\_provided" to allow users to provide their own token from the WebUI. | BINGAI\_TOKEN=user\_provided |
| BINGAI\_HOST | string | Bing host URL. Leave commented out to use default server. | \# BINGAI\_HOST=https://cn.bing.com |

Note: It is recommended to leave it as “user\_provided” and provide the token from the WebUI.

### Google [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#google)

Follow these instructions to setup the [Google Endpoint](https://www.librechat.ai/docs/configuration/pre_configured_ai/google)

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| GOOGLE\_KEY | string | Google API key. Set to "user\_provided" to allow users to provide their own API key from the WebUI. | GOOGLE\_KEY=user\_provided |
| GOOGLE\_REVERSE\_PROXY | string | Google reverse proxy URL. | GOOGLE\_REVERSE\_PROXY= |
| GOOGLE\_MODELS | string | Available Gemini API Google models, separated by commas. | GOOGLE\_MODELS=gemini-1.0-pro,gemini-1.0-pro-001,gemini-1.0-pro-latest,gemini-1.0-pro-vision-latest,gemini-1.5-pro-latest,gemini-pro,gemini-pro-vision |
| GOOGLE\_MODELS | string | Available Vertex AI Google models, separated by commas. | GOOGLE\_MODELS=gemini-1.5-pro-preview-0409,gemini-1.0-pro-vision-001,gemini-pro,gemini-pro-vision,chat-bison,chat-bison-32k,codechat-bison,codechat-bison-32k,text-bison,text-bison-32k,text-unicorn,code-gecko,code-bison,code-bison-32k |
| GOOGLE\_TITLE\_MODEL | string | DEPRECATED: The model used for titling with Google. | GOOGLE\_TITLE\_MODEL=gemini-pro |
| GOOGLE\_LOC | string | Specifies the Google Cloud location for processing API requests | GOOGLE\_LOC=us-central1 |
| GOOGLE\_EXCLUDE\_SAFETY\_SETTINGS | string | Completely omit the safety settings that are included by default, which will use provider defaults | GOOGLE\_EXCLUDE\_SAFETY\_SETTINGS=true |
| GOOGLE\_SAFETY\_SEXUALLY\_EXPLICIT | string | Safety setting for sexually explicit content. Options are BLOCK\_ALL, BLOCK\_ONLY\_HIGH, WARN\_ONLY, and OFF. | GOOGLE\_SAFETY\_SEXUALLY\_EXPLICIT=BLOCK\_ONLY\_HIGH |
| GOOGLE\_SAFETY\_HATE\_SPEECH | string | Safety setting for hate speech content. Options are BLOCK\_ALL, BLOCK\_ONLY\_HIGH, WARN\_ONLY, and OFF. | GOOGLE\_SAFETY\_HATE\_SPEECH=BLOCK\_ONLY\_HIGH |
| GOOGLE\_SAFETY\_HARASSMENT | string | Safety setting for harassment content. Options are BLOCK\_ALL, BLOCK\_ONLY\_HIGH, WARN\_ONLY, and OFF. | GOOGLE\_SAFETY\_HARASSMENT=BLOCK\_ONLY\_HIGH |
| GOOGLE\_SAFETY\_DANGEROUS\_CONTENT | string | Safety setting for dangerous content. Options are BLOCK\_ALL, BLOCK\_ONLY\_HIGH, WARN\_ONLY, and OFF. | GOOGLE\_SAFETY\_DANGEROUS\_CONTENT=BLOCK\_ONLY\_HIGH |

Customize the available models, separated by commas, **without spaces**. The first will be default. Leave it blank or commented out to use internal settings.

- `GOOGLE_TITLE_MODEL` is now deprecated and will be removed in future versions. Use the [`titleModel` Endpoint Setting](https://www.librechat.ai/docs/configuration/librechat_yaml/object_structure/shared_endpoint_settings#titlemodel) instead in the `librechat.yaml` config instead.

**Note:** For the Vertex AI `GOOGLE_SAFETY` variables, you do not have access to the `BLOCK_NONE` setting by default. To use this restricted `HarmBlockThreshold` setting, you will need to either:

- (a) Get access through an allowlist via your Google account team
- (b) Switch your account type to monthly invoiced billing following this instruction:
[https://cloud.google.com/billing/docs/how-to/invoiced-billing](https://cloud.google.com/billing/docs/how-to/invoiced-billing)

### OpenAI [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#openai)

See: [OpenAI Setup](https://www.librechat.ai/docs/configuration/pre_configured_ai/openai)

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| OPENAI\_API\_KEY | string | Your OpenAI API key. Leave blank to disable this endpoint or set to "user\_provided" to allow users to provide their own API key from the WebUI. | OPENAI\_API\_KEY=user\_provided |
| OPENAI\_MODELS | string | Customize the available models, separated by commas, without spaces. The first will be default. Leave commented out to use internal settings. | \# OPENAI\_MODELS=gpt-3.5-turbo-0125,gpt-3.5-turbo-0301,gpt-3.5-turbo,gpt-4,gpt-4-0613,gpt-4-vision-preview,gpt-3.5-turbo-0613,gpt-3.5-turbo-16k-0613,gpt-4-0125-preview,gpt-4-turbo-preview,gpt-4-1106-preview,gpt-3.5-turbo-1106,gpt-3.5-turbo-instruct,gpt-3.5-turbo-instruct-0914,gpt-3.5-turbo-16k |
| DEBUG\_OPENAI | boolean | Enable debug mode for the OpenAI endpoint. | DEBUG\_OPENAI=false |
| OPENAI\_SUMMARIZE | boolean | Enable message summarization. False by default | \# OPENAI\_SUMMARIZE=true |
| OPENAI\_SUMMARY\_MODEL | string | The model used for OpenAI summarization. | \# OPENAI\_SUMMARY\_MODEL=gpt-3.5-turbo |
| OPENAI\_FORCE\_PROMPT | boolean | Force the API to be called with a prompt payload instead of a messages payload. | \# OPENAI\_FORCE\_PROMPT=false |
| OPENAI\_ORGANIZATION | string | Specify which organization to use for each API request to OpenAI. Optional | \# OPENAI\_ORGANIZATION= |
| OPENAI\_REVERSE\_PROXY | string | DEPRECATED: Reverse proxy settings for OpenAI. | \# OPENAI\_REVERSE\_PROXY= |
| OPENAI\_TITLE\_MODEL | string | DEPRECATED: The model used for OpenAI titling. | \# OPENAI\_TITLE\_MODEL=gpt-3.5-turbo |

- `OPENAI_TITLE_MODEL` is now deprecated and will be removed in future versions. Use the [`titleModel` Endpoint Setting](https://www.librechat.ai/docs/configuration/librechat_yaml/object_structure/shared_endpoint_settings#titlemodel) instead in the `librechat.yaml` config instead.
- `OPENAI_REVERSE_PROXY` is now deprecated and will be removed in future versions. Use a [custom endpoint](https://www.librechat.ai/docs/quick_start/custom_endpoints) instead.

### Assistants [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#assistants)

See: [Assistants Setup](https://www.librechat.ai/docs/configuration/pre_configured_ai/assistants)

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| ASSISTANTS\_API\_KEY | string | Your OpenAI API key for Assistants API. Leave blank to disable this endpoint or set to "user\_provided" to allow users to provide their own API key from the WebUI. | ASSISTANTS\_API\_KEY=user\_provided |
| ASSISTANTS\_MODELS | string | Customize the available models, separated by commas, without spaces. The first will be default. Leave blank to use internal settings. | \# ASSISTANTS\_MODELS=gpt-3.5-turbo-0125,gpt-3.5-turbo-16k-0613,gpt-3.5-turbo-16k,gpt-3.5-turbo,gpt-4,gpt-4-0314,gpt-4-32k-0314,gpt-4-0613,gpt-3.5-turbo-0613,gpt-3.5-turbo-1106,gpt-4-0125-preview,gpt-4-turbo-preview,gpt-4-1106-preview |
| ASSISTANTS\_BASE\_URL | string | Alternate base URL for Assistants API. | \# ASSISTANTS\_BASE\_URL= |

Note: You can customize the available models, separated by commas, without spaces. The first will be default. Leave it blank or commented out to use internal settings.

### Plugins [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#plugins)

**Note:** Plugins are now deprecated. Use [Agents](https://www.librechat.ai/docs/features/agents) instead.

Here are some useful resources about plugins:

- [Introduction](https://www.librechat.ai/docs/features/plugins)
- [Make Your Own](https://www.librechat.ai/docs/development/tools_and_plugins)

#### Environment Variables [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#environment-variables-1)

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| PLUGIN\_MODELS | string | Identify available models, separated by commas without spaces. The first model in the list will be set as default. Defaults to internal settings. | \# PLUGIN\_MODELS=gpt-4,gpt-4-turbo,gpt-4-turbo-preview,gpt-4-0125-preview,gpt-4-1106-preview,gpt-4-0613,gpt-3.5-turbo,gpt-3.5-turbo-0125,gpt-3.5-turbo-1106,gpt-3.5-turbo-0613 |

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| DEBUG\_PLUGINS | boolean | Set to false to disable debug mode for plugins. | DEBUG\_PLUGINS=true |

⚠️

Warning

- The API keys are “user\_provided” through the webUI when commented out or empty. Do not set them to “user\_provided”, either provide the API key or leave them blank/commented out.

✏️

Note

**Note:** Make sure the `gptPlugins` endpoint is set in the [`ENDPOINTS`](https://www.librechat.ai/docs/configuration/dotenv#endpoints) environment variable if it was configured before.

#### Azure AI Search [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#azure-ai-search)

This plugin supports searching Azure AI Search for answers to your questions. See: [Azure AI Search](https://www.librechat.ai/docs/configuration/tools/azure_ai_search)

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| AZURE\_AI\_SEARCH\_SERVICE\_ENDPOINT | string | The service endpoint for Azure AI Search. | AZURE\_AI\_SEARCH\_SERVICE\_ENDPOINT= |
| AZURE\_AI\_SEARCH\_INDEX\_NAME | string | The index name for Azure AI Search. | AZURE\_AI\_SEARCH\_INDEX\_NAME= |
| AZURE\_AI\_SEARCH\_API\_KEY | string | The API key for Azure AI Search. | AZURE\_AI\_SEARCH\_API\_KEY= |
| AZURE\_AI\_SEARCH\_API\_VERSION | string | The API version for Azure AI Search. | AZURE\_AI\_SEARCH\_API\_VERSION= |
| AZURE\_AI\_SEARCH\_SEARCH\_OPTION\_QUERY\_TYPE | string | The query type for Azure AI Search. | AZURE\_AI\_SEARCH\_SEARCH\_OPTION\_QUERY\_TYPE= |
| AZURE\_AI\_SEARCH\_SEARCH\_OPTION\_TOP | number | The top count for Azure AI Search. | AZURE\_AI\_SEARCH\_SEARCH\_OPTION\_TOP= |
| AZURE\_AI\_SEARCH\_SEARCH\_OPTION\_SELECT | string | The select fields for Azure AI Search. | AZURE\_AI\_SEARCH\_SEARCH\_OPTION\_SELECT= |

#### DALL-E: [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#dall-e)

**API Keys:**

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| DALLE\_API\_KEY | string | The OpenAI API key for DALL-E 2 and DALL-E 3 services. | \# DALLE2\_API\_KEY= |

**API Keys (Version Specific):**

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| DALLE3\_API\_KEY | string | The OpenAI API key for DALL-E 3. | \# DALLE3\_API\_KEY= |
| DALLE2\_API\_KEY | string | The OpenAI API key for DALL-E 2. | \# DALLE2\_API\_KEY= |

**System Prompts:**

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| DALLE3\_SYSTEM\_PROMPT | string | The system prompt for DALL-E 3. | \# DALLE3\_SYSTEM\_PROMPT= |
| DALLE2\_SYSTEM\_PROMPT | string | The system prompt for DALL-E 2. | \# DALLE2\_SYSTEM\_PROMPT= |

**Reverse Proxy Settings:**

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| DALLE\_REVERSE\_PROXY | string | The reverse proxy URL for DALL-E API requests. | \# DALLE\_REVERSE\_PROXY= |

**Base URLs:**

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| DALLE3\_BASEURL | string | The base URL for DALL-E 3 API endpoints. | \# DALLE3\_BASEURL= |
| DALLE2\_BASEURL | string | The base URL for DALL-E 2 API endpoints. | \# DALLE2\_BASEURL= |

**Azure OpenAI Integration (Optional):**

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| DALLE3\_AZURE\_API\_VERSION | string | The API version for DALL-E 3 with Azure OpenAI service. | \# DALLE3\_AZURE\_API\_VERSION= |
| DALLE2\_AZURE\_API\_VERSION | string | The API version for DALL-E 2 with Azure OpenAI service. | \# DALLE2\_AZURE\_API\_VERSION= |

Remember to replace placeholder text with actual prompts or instructions and provide your actual API keys if you choose to include them directly in the file (though managing sensitive keys outside of the codebase is a best practice). Always review and respect OpenAI’s usage policies when embedding API keys in software.

> Note: if you have PROXY set, it will be used for DALL-E calls also, which is universal for the app.

#### OpenAI Image Tools: [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#openai-image-tools)

**API Keys:**

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| IMAGE\_GEN\_OAI\_API\_KEY | string | The OpenAI API key for image generation and editing. Required for these tools to work. | \# IMAGE\_GEN\_OAI\_API\_KEY= |

**Base URL and Azure Integration:**

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| IMAGE\_GEN\_OAI\_BASEURL | string | Custom base URL for OpenAI image API requests. | \# IMAGE\_GEN\_OAI\_BASEURL= |
| IMAGE\_GEN\_OAI\_AZURE\_API\_VERSION | string | API version for Azure OpenAI image services. | \# IMAGE\_GEN\_OAI\_AZURE\_API\_VERSION= |

**Tool Descriptions:**

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| IMAGE\_GEN\_OAI\_DESCRIPTION\_WITH\_FILES | string | Custom description for the image generation tool when files are present. | \# IMAGE\_GEN\_OAI\_DESCRIPTION\_WITH\_FILES= |
| IMAGE\_GEN\_OAI\_DESCRIPTION\_NO\_FILES | string | Custom description for the image generation tool when no files are present. | \# IMAGE\_GEN\_OAI\_DESCRIPTION\_NO\_FILES= |
| IMAGE\_EDIT\_OAI\_DESCRIPTION | string | Custom description for the image editing tool. | \# IMAGE\_EDIT\_OAI\_DESCRIPTION= |

**Prompt Descriptions:**

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| IMAGE\_GEN\_OAI\_PROMPT\_DESCRIPTION | string | Custom description for the image generation prompt parameter. | \# IMAGE\_GEN\_OAI\_PROMPT\_DESCRIPTION= |
| IMAGE\_EDIT\_OAI\_PROMPT\_DESCRIPTION | string | Custom description for the image editing prompt parameter. | \# IMAGE\_EDIT\_OAI\_PROMPT\_DESCRIPTION= |

> Note: These tools provide image generation and editing capabilities using OpenAI’s latest models. The image generation tool creates new images from text descriptions, while the image editing tool modifies existing images based on uploaded reference images and text instructions.

#### DALL-E (Azure) [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#dall-e-azure)

Here’s the updated layout for the DALL-E configuration options:

**API Keys:**

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| DALLE\_API\_KEY | string | The OpenAI API key for DALL-E 2 and DALL-E 3 services. | \# DALLE\_API\_KEY= |

**API Keys (Version Specific):**

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| DALLE3\_API\_KEY | string | The OpenAI API key for DALL-E 3. | \# DALLE3\_API\_KEY= |
| DALLE2\_API\_KEY | string | The OpenAI API key for DALL-E 2. | \# DALLE2\_API\_KEY= |

**System Prompts:**

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| DALLE3\_SYSTEM\_PROMPT | string | The system prompt for DALL-E 3. | \# DALLE3\_SYSTEM\_PROMPT="Your DALL-E-3 System Prompt here" |
| DALLE2\_SYSTEM\_PROMPT | string | The system prompt for DALL-E 2. | \# DALLE2\_SYSTEM\_PROMPT="Your DALL-E-2 System Prompt here" |

**Reverse Proxy Settings:**

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| DALLE\_REVERSE\_PROXY | string | The reverse proxy URL for DALL-E API requests. | \# DALLE\_REVERSE\_PROXY= |

**Base URLs:**

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| DALLE3\_BASEURL | string | The base URL for DALL-E 3 API endpoints. | \# DALLE3\_BASEURL=https://<AZURE\_OPENAI\_API\_INSTANCE\_NAME>.openai.azure.com/openai/deployments/<DALLE3\_DEPLOYMENT\_NAME>/ |
| DALLE2\_BASEURL | string | The base URL for DALL-E 2 API endpoints. | \# DALLE2\_BASEURL=https://<AZURE\_OPENAI\_API\_INSTANCE\_NAME>.openai.azure.com/openai/deployments/<DALLE2\_DEPLOYMENT\_NAME>/ |

**Azure OpenAI Integration (Optional):**

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| DALLE3\_AZURE\_API\_VERSION | string | The API version for DALL-E 3 with Azure OpenAI service. | \# DALLE3\_AZURE\_API\_VERSION=the-api-version # e.g.: 2023-12-01-preview |
| DALLE2\_AZURE\_API\_VERSION | string | The API version for DALL-E 2 with Azure OpenAI service. | \# DALLE2\_AZURE\_API\_VERSION=the-api-version # e.g.: 2023-12-01-preview |

Remember to replace placeholder text with actual prompts or instructions and provide your actual API keys if you choose to include them directly in the file (though managing sensitive keys outside of the codebase is a best practice). Always review and respect OpenAI’s usage policies when embedding API keys in software.

> Note: if you have PROXY set, it will be used for DALL-E calls also, which is universal for the app.

#### OpenAI Image Tools [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#openai-image-tools-1)

**API Keys:**

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| IMAGE\_GEN\_OAI\_API\_KEY | string | The OpenAI API key for image generation and editing. Required for these tools to work. | \# IMAGE\_GEN\_OAI\_API\_KEY= |

**Base URL and Azure Integration:**

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| IMAGE\_GEN\_OAI\_BASEURL | string | Custom base URL for OpenAI image API requests. | \# IMAGE\_GEN\_OAI\_BASEURL= |
| IMAGE\_GEN\_OAI\_AZURE\_API\_VERSION | string | API version for Azure OpenAI image services. | \# IMAGE\_GEN\_OAI\_AZURE\_API\_VERSION= |

**Tool Descriptions:**

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| IMAGE\_GEN\_OAI\_DESCRIPTION\_WITH\_FILES | string | Custom description for the image generation tool when files are present. | \# IMAGE\_GEN\_OAI\_DESCRIPTION\_WITH\_FILES= |
| IMAGE\_GEN\_OAI\_DESCRIPTION\_NO\_FILES | string | Custom description for the image generation tool when no files are present. | \# IMAGE\_GEN\_OAI\_DESCRIPTION\_NO\_FILES= |
| IMAGE\_EDIT\_OAI\_DESCRIPTION | string | Custom description for the image editing tool. | \# IMAGE\_EDIT\_OAI\_DESCRIPTION= |

**Prompt Descriptions:**

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| IMAGE\_GEN\_OAI\_PROMPT\_DESCRIPTION | string | Custom description for the image generation prompt parameter. | \# IMAGE\_GEN\_OAI\_PROMPT\_DESCRIPTION= |
| IMAGE\_EDIT\_OAI\_PROMPT\_DESCRIPTION | string | Custom description for the image editing prompt parameter. | \# IMAGE\_EDIT\_OAI\_PROMPT\_DESCRIPTION= |

> Note: These tools provide image generation and editing capabilities using OpenAI’s latest models. The image generation tool creates new images from text descriptions, while the image editing tool modifies existing images based on uploaded reference images and text instructions.

#### Google Search [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#google-search)

See detailed instructions here: **[Google Search](https://www.librechat.ai/docs/configuration/tools/google_search)**

**Environment Variables:**

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| GOOGLE\_SEARCH\_API\_KEY | string | Google Search API key. | GOOGLE\_SEARCH\_API\_KEY= |
| GOOGLE\_CSE\_ID | string | Google Custom Search Engine ID. | GOOGLE\_CSE\_ID= |

#### SerpAPI [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#serpapi)

**Description:** SerpApi is a real-time API to access Google search results (not as performant)

**Environment Variables:**

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| SERPAPI\_API\_KEY | string | Your SerpAPI API key. | SERPAPI\_API\_KEY= |

#### Stable Diffusion (Automatic1111) [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#stable-diffusion-automatic1111)

See detailed instructions here: **[Stable Diffusion](https://www.librechat.ai/docs/configuration/tools/stable_diffusion)**

**Description:** Use `http://127.0.0.1:7860` with local install and `http://host.docker.internal:7860` for docker

**Environment Variables:**

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| SD\_WEBUI\_URL | string | Stable Diffusion web UI URL. | SD\_WEBUI\_URL=http://host.docker.internal:7860 |

#### Flux [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#flux)

**Description:** Cloud generator with an emphasis on speed and optional fine-tuned models.

**Environment Variables:**

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| FLUX\_API\_KEY | string | Flux API key. | \# FLUX\_API\_KEY=flux\_live\_... |
| FLUX\_API\_BASE\_URL | string | Flux API base URL. | \# FLUX\_API\_BASE\_URL=https://api.us1.bfl.ai |

### Tavily [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#tavily)

Get your API key here: **[https://tavily.com/#api](https://tavily.com/#api)**

**Environment Variables:**

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| TAVILY\_API\_KEY | string | Tavily API key. | TAVILY\_API\_KEY= |

### Traversaal [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#traversaal)

**Description:** LLM-enhanced search tool.

Get API key here: **[https://api.traversaal.ai/dashboard](https://api.traversaal.ai/dashboard)**

**Environment Variables:**

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| TRAVERSAAL\_API\_KEY | string | Traversaal API key. | TRAVERSAAL\_API\_KEY= |

### WolframAlpha [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#wolframalpha)

See detailed instructions here: **[Wolfram Alpha](https://www.librechat.ai/docs/configuration/tools/wolfram)**

**Environment Variables:**

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| WOLFRAM\_APP\_ID | string | Wolfram Alpha App ID. | WOLFRAM\_APP\_ID= |

### Zapier [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#zapier)

**Description:** \- You need a Zapier account. Get your API key from here: **[Zapier](https://nla.zapier.com/credentials/)**

- Create allowed actions - Follow step 3 in this getting start guide from Zapier

**Note:** Zapier is known to be finicky with certain actions. Writing email drafts is probably the best use of it.

**Environment Variables:**

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| ZAPIER\_NLA\_API\_KEY | string | Zapier NLA API key. | ZAPIER\_NLA\_API\_KEY= |

## Code Interpreter [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#code-interpreter)

The Code Interpreter API provides a secure environment for executing code and managing files. See: [Code Interpreter API](https://www.librechat.ai/docs/features/code_interpreter)

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| LIBRECHAT\_CODE\_API\_KEY | string | API key for the Code Interpreter service. When set globally, provides access to all users. | LIBRECHAT\_CODE\_API\_KEY=your-api-key |
| LIBRECHAT\_CODE\_BASEURL | string | Custom base URL for the Code Interpreter API (Enterprise plans only). | \# LIBRECHAT\_CODE\_BASEURL=https://your-custom-domain.com |

## Artifacts [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#artifacts)

Artifacts leverage the CodeSandbox library for secure rendering of HTML/JS code. By default, the public CDN hosted by CodeSandbox is used.

Fortunately, for those with internal network requirements, you can [self-host the bundler](https://sandpack.codesandbox.io/docs/guides/hosting-the-bundler) that compiles the frontend code and specify a custom bundler URL for Sandpack.

For more info, including pre-made container images for self-hosting with metric requests removed, see: [https://github.com/LibreChat-AI/codesandbox-client](https://github.com/LibreChat-AI/codesandbox-client)

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| SANDPACK\_BUNDLER\_URL | string | Specifies a custom bundler URL for Sandpack, used by Artifacts | SANDPACK\_BUNDLER\_URL=your-bundler-url |

## Search (Meilisearch) [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#search-meilisearch)

Enables search in messages and conversations:

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| SEARCH | boolean | Enables search in messages and conversations. | SEARCH=true |

> Note: If you’re not using docker, it requires the installation of the free self-hosted Meilisearch or a paid remote plan

To disable anonymized telemetry analytics for MeiliSearch for absolute privacy, set to true:

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| MEILI\_NO\_ANALYTICS | boolean | Disables anonymized telemetry analytics for MeiliSearch. | MEILI\_NO\_ANALYTICS=true |

For the API server to connect to the search server. Replace ‘0.0.0.0’ with ‘meilisearch’ if serving MeiliSearch with docker-compose.

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| MEILI\_HOST | string | The API server connection to the search server. | MEILI\_HOST=http://0.0.0.0:7700 |

This master key must be at least 16 bytes, composed of valid UTF-8 characters. MeiliSearch will throw an error and refuse to launch if no master key is provided or if it is under 16 bytes. MeiliSearch will suggest a secure autogenerated master key. This is a ready-made secure key for docker-compose, you can replace it with your own.

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| MEILI\_MASTER\_KEY | string | The master key for MeiliSearch. | MEILI\_MASTER\_KEY=DrhYf7zENyR6AlUCKmnz0eYASOQdl6zxH7s7MKFSfFCt |

To prevent LibreChat from attempting a database indexing sync with Meilisearch, you can set the following environment variable to `true`. This is useful in a node cluster, or multi-node setup, where only one instance should be responsible for indexing.

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| MEILI\_NO\_SYNC | string | Toggle for disabling Mellisearch index sync | MEILI\_NO\_SYNC=true |

## User System [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#user-system)

This section contains the configuration for:

- [Automated Moderation](https://www.librechat.ai/docs/configuration/dotenv#moderation)
- [Balance/Token Usage](https://www.librechat.ai/docs/configuration/dotenv#balance)
- [Registration and Social Logins](https://www.librechat.ai/docs/configuration/dotenv#registration-and-login)
- [Email Password Reset](https://www.librechat.ai/docs/configuration/dotenv#email-password-reset)

### Moderation [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#moderation)

The Automated Moderation System uses a scoring mechanism to track user violations. As users commit actions like excessive logins, registrations, or messaging, they accumulate violation scores. Upon reaching a set threshold, the user and their IP are temporarily banned. This system ensures platform security by monitoring and penalizing rapid or suspicious activities.

see: **[Automated Moderation](https://www.librechat.ai/docs/configuration/mod_system)**

#### Basic Moderation Settings [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#basic-moderation-settings)

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| OPENAI\_MODERATION | boolean | Whether or not to enable OpenAI moderation on the \*\*OpenAI\*\* and \*\*Plugins\*\* endpoints. | OPENAI\_MODERATION=false |
| OPENAI\_MODERATION\_API\_KEY | string | Your OpenAI API key. | OPENAI\_MODERATION\_API\_KEY= |
| OPENAI\_MODERATION\_REVERSE\_PROXY | string | Note: Commented out by default, this is not working with all reverse proxys. | \# OPENAI\_MODERATION\_REVERSE\_PROXY= |

#### Banning Settings [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#banning-settings)

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| BAN\_VIOLATIONS | boolean | Whether or not to enable banning users for violations (they will still be logged). | BAN\_VIOLATIONS=true |
| BAN\_DURATION | integer | How long the user and associated IP are banned for (in milliseconds). | BAN\_DURATION=1000 \* 60 \* 60 \* 2 |
| BAN\_INTERVAL | integer | The user will be banned every time their score reaches/crosses over the interval threshold. | BAN\_INTERVAL=20 |

#### Score for each violation [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#score-for-each-violation)

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| LOGIN\_VIOLATION\_SCORE | integer | Score for login violations. | LOGIN\_VIOLATION\_SCORE=1 |
| REGISTRATION\_VIOLATION\_SCORE | integer | Score for registration violations. | REGISTRATION\_VIOLATION\_SCORE=1 |
| CONCURRENT\_VIOLATION\_SCORE | integer | Score for concurrent violations. | CONCURRENT\_VIOLATION\_SCORE=1 |
| MESSAGE\_VIOLATION\_SCORE | integer | Score for message violations. | MESSAGE\_VIOLATION\_SCORE=1 |
| NON\_BROWSER\_VIOLATION\_SCORE | integer | Score for non-browser violations. | NON\_BROWSER\_VIOLATION\_SCORE=20 |
| ILLEGAL\_MODEL\_REQ\_SCORE | integer | Score for illegal model requests. | ILLEGAL\_MODEL\_REQ\_SCORE=5 |

> Note: Non-browser access and Illegal model requests are almost always nefarious as it means a 3rd party is attempting to access the server through an automated script.

#### Message rate limiting (per user & IP) [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#message-rate-limiting-per-user--ip)

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| LIMIT\_CONCURRENT\_MESSAGES | boolean | Whether to limit the amount of messages a user can send per request. | LIMIT\_CONCURRENT\_MESSAGES=true |
| CONCURRENT\_MESSAGE\_MAX | integer | The max amount of messages a user can send per request. | CONCURRENT\_MESSAGE\_MAX=2 |

#### Limiters [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#limiters)

> Note: You can utilize both limiters, but default is to limit by IP only.

##### IP Limiter: [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#ip-limiter)

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| LIMIT\_MESSAGE\_IP | boolean | Whether to limit the amount of messages an IP can send per \`MESSAGE\_IP\_WINDOW\`. | LIMIT\_MESSAGE\_IP=true |
| MESSAGE\_IP\_MAX | integer | The max amount of messages an IP can send per \`MESSAGE\_IP\_WINDOW\`. | MESSAGE\_IP\_MAX=40 |
| MESSAGE\_IP\_WINDOW | integer | In minutes, determines the window of time for \`MESSAGE\_IP\_MAX\` messages. | MESSAGE\_IP\_WINDOW=1 |

##### User Limiter: [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#user-limiter)

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| LIMIT\_MESSAGE\_USER | boolean | Whether to limit the amount of messages an user can send per \`MESSAGE\_USER\_WINDOW\`. | LIMIT\_MESSAGE\_USER=false |
| MESSAGE\_USER\_MAX | integer | The max amount of messages an user can send per \`MESSAGE\_USER\_WINDOW\`. | MESSAGE\_USER\_MAX=40 |
| MESSAGE\_USER\_WINDOW | integer | In minutes, determines the window of time for \`MESSAGE\_USER\_MAX\` messages. | MESSAGE\_USER\_WINDOW=1 |

### Balance [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#balance)

The following feature allows for the management of user balances within the system’s endpoints. You have the option to add balances manually, or you may choose to implement a system that accumulates balances automatically for users. If a specific initial balance is defined in the configuration, tokens will be credited to the user’s balance automatically when they register.

see: **[Token Usage](https://www.librechat.ai/docs/configuration/token_usage)**

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| CHECK\_BALANCE | boolean | Enable token credit balances for the OpenAI/Plugins endpoints. | CHECK\_BALANCE=false |
| START\_BALANCE | integer | If the value is set, tokens will be credited to the user's balance after registration. | START\_BALANCE=20000 |

#### Managing Balances [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#managing-balances)

- Run `npm run add-balance` to manually add balances.
  - You can also specify the email and token credit amount to add, e.g.: `npm run add-balance example@example.com 1000`
- Run `npm run set-balance` to manually set balances, similar to `add-balance`.
- Run `npm run list-balances` to list the balance of every user.

> **Note:** 1000 credits = $0.001 (1 mill USD)

### Registration and Login [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#registration-and-login)

see: **[Authentication System](https://www.librechat.ai/docs/configuration/authentication)**

![Image for Light Theme](https://github.com/danny-avila/LibreChat/assets/32828263/4c51dc25-31d3-4c51-8c2a-0cdfb5a25033)

![Image for Dark Theme](https://github.com/danny-avila/LibreChat/assets/32828263/3bc5371d-e51d-4e91-ac68-56db6e85bb2c)

ℹ️

Configuration File Clarification

All authentication settings in this section should be configured in your `.env` file, not in the `librechat.yaml` file or `docker-compose.override.yml`. The `docker-compose.override.yml` file is only used to mount volumes and set environment variables for Docker, while the `librechat.yaml` file is used for custom endpoints and other application settings.

- General Settings:

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| ALLOW\_EMAIL\_LOGIN | boolean | Enable or disable ONLY email login. | ALLOW\_EMAIL\_LOGIN=true |
| ALLOW\_REGISTRATION | boolean | Enable or disable Email registration of new users. | ALLOW\_REGISTRATION=true |
| ALLOW\_SOCIAL\_LOGIN | boolean | Allow users to connect to LibreChat with various social networks. | ALLOW\_SOCIAL\_LOGIN=false |
| ALLOW\_SOCIAL\_REGISTRATION | boolean | Enable or disable registration of new users using various social networks. | ALLOW\_SOCIAL\_REGISTRATION=false |
| ALLOW\_PASSWORD\_RESET | boolean | Enable or disable the ability for users to reset their password by themselves | ALLOW\_PASSWORD\_RESET=false |
| ALLOW\_ACCOUNT\_DELETION | boolean | Enable or disable the ability for users to delete their account by themselves. Enabled by default if omitted/commented out | ALLOW\_ACCOUNT\_DELETION=true |
| ALLOW\_UNVERIFIED\_EMAIL\_LOGIN | boolean | Set to true to allow users to log in without verifying their email address. If set to false, users will be required to verify their email before logging in. | ALLOW\_UNVERIFIED\_EMAIL\_LOGIN=true |

> **Quick Tip:** Even with registration disabled, add users directly to the database using `npm run create-user`.
> **Quick Tip:** With registration disabled, you can delete a user with `npm run delete-user email@domain.com`.

- Session and Refresh Token Settings:

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| SESSION\_EXPIRY | integer (milliseconds) | Session expiry time. | SESSION\_EXPIRY=1000 \* 60 \* 15 |
| REFRESH\_TOKEN\_EXPIRY | integer (milliseconds) | Refresh token expiry time. | REFRESH\_TOKEN\_EXPIRY=(1000 \* 60 \* 60 \* 24) \* 7 |

- For more information: **[Refresh Token](https://github.com/danny-avila/LibreChat/pull/927)**

- JWT Settings:


You should use new secure values. The examples given are 32-byte keys (64 characters in hex).
Use this replit to generate some quickly: **[JWT Keys](https://www.librechat.ai/toolkit/creds_generator)**

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| JWT\_SECRET | string (hex) | JWT secret key. | JWT\_SECRET=16f8c0ef4a5d391b26034086c628469d3f9f497f08163ab9b40137092f2909ef |
| JWT\_REFRESH\_SECRET | string (hex) | JWT refresh secret key. | JWT\_REFRESH\_SECRET=eaa5191f2914e30b9387fd84e254e4ba6fc51b4654968a9b0803b456a54b8418 |

### Social Logins [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#social-logins)

For more details: [OAuth2-OIDC](https://www.librechat.ai/docs/configuration/authentication/OAuth2-OIDC)

#### [Apple Authentication](https://www.librechat.ai/docs/configuration/authentication/OAuth2-OIDC/apple) [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#apple-authentication)

For more information: **[Apple Authentication](https://www.librechat.ai/docs/configuration/authentication/OAuth2-OIDC/apple)**

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| APPLE\_CLIENT\_ID | string | Your Apple Services ID (e.g., com.yourdomain.librechat.services). | APPLE\_CLIENT\_ID=com.yourdomain.librechat.services |
| APPLE\_TEAM\_ID | string | Your Apple Developer Team ID. | APPLE\_TEAM\_ID=YOUR\_TEAM\_ID |
| APPLE\_KEY\_ID | string | Your Apple Key ID from the downloaded key. | APPLE\_KEY\_ID=YOUR\_KEY\_ID |
| APPLE\_PRIVATE\_KEY\_PATH | string | Absolute path to your downloaded .p8 file. | APPLE\_PRIVATE\_KEY\_PATH=/path/to/AuthKey.p8 |
| APPLE\_CALLBACK\_URL | string | The callback URL for Apple authentication. | APPLE\_CALLBACK\_URL=/oauth/apple/callback |

#### [Discord Authentication](https://www.librechat.ai/docs/configuration/authentication/OAuth2-OIDC/discord) [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#discord-authentication)

For more information: **[Discord](https://www.librechat.ai/docs/configuration/authentication/OAuth2-OIDC/discord)**

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| DISCORD\_CLIENT\_ID | string | Your Discord client ID. | DISCORD\_CLIENT\_ID= |
| DISCORD\_CLIENT\_SECRET | string | Your Discord client secret. | DISCORD\_CLIENT\_SECRET= |
| DISCORD\_CALLBACK\_URL | string | The callback URL for Discord authentication. | DISCORD\_CALLBACK\_URL=/oauth/discord/callback |

#### [Facebook Authentication](https://www.librechat.ai/docs/configuration/authentication/OAuth2-OIDC/facebook) [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#facebook-authentication)

For more information: **[Facebook Authentication](https://www.librechat.ai/docs/configuration/authentication/OAuth2-OIDC/facebook)**

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| FACEBOOK\_CLIENT\_ID | string | Your Facebook client ID. | FACEBOOK\_CLIENT\_ID= |
| FACEBOOK\_CLIENT\_SECRET | string | Your Facebook client secret. | FACEBOOK\_CLIENT\_SECRET= |
| FACEBOOK\_CALLBACK\_URL | string | The callback URL for Facebook authentication. | FACEBOOK\_CALLBACK\_URL=/oauth/facebook/callback |

#### [GitHub Authentication](https://www.librechat.ai/docs/configuration/authentication/OAuth2-OIDC/github) [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#github-authentication)

For more information: **[GitHub Authentication](https://www.librechat.ai/docs/configuration/authentication/OAuth2-OIDC/github)**

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| GITHUB\_CLIENT\_ID | string | Your GitHub client ID. | GITHUB\_CLIENT\_ID= |
| GITHUB\_CLIENT\_SECRET | string | Your GitHub client secret. | GITHUB\_CLIENT\_SECRET= |
| GITHUB\_CALLBACK\_URL | string | The callback URL for GitHub authentication. | GITHUB\_CALLBACK\_URL=/oauth/github/callback |
| GITHUB\_ENTERPRISE\_BASE\_URL | string | Optional: The base URL for your GitHub Enterprise instance. | GITHUB\_ENTERPRISE\_BASE\_URL= |
| GITHUB\_ENTERPRISE\_USER\_AGENT | string | Optional: The user agent for GitHub Enterprise requests. | GITHUB\_ENTERPRISE\_USER\_AGENT= |

#### [Google Authentication](https://www.librechat.ai/docs/configuration/authentication/OAuth2-OIDC/google) [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#google-authentication)

For more information: **[Google Authentication](https://www.librechat.ai/docs/configuration/authentication/OAuth2-OIDC/google)**

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| GOOGLE\_CLIENT\_ID | string | Your Google client ID. | GOOGLE\_CLIENT\_ID= |
| GOOGLE\_CLIENT\_SECRET | string | Your Google client secret. | GOOGLE\_CLIENT\_SECRET= |
| GOOGLE\_CALLBACK\_URL | string | The callback URL for Google authentication. | GOOGLE\_CALLBACK\_URL=/oauth/google/callback |

#### [OpenID Connect](https://www.librechat.ai/docs/configuration/authentication/OAuth2-OIDC\#openid-connect) [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#openid-connect)

For more information:

- [AWS Cognito](https://www.librechat.ai/docs/configuration/authentication/OAuth2-OIDC/aws)
- [Azure Entra/AD](https://www.librechat.ai/docs/configuration/authentication/OAuth2-OIDC/azure)
- [Keycloak](https://www.librechat.ai/docs/configuration/authentication/OAuth2-OIDC/keycloak)

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| OPENID\_CLIENT\_ID | string | Your OpenID client ID. | OPENID\_CLIENT\_ID= |
| OPENID\_CLIENT\_SECRET | string | Your OpenID client secret. | OPENID\_CLIENT\_SECRET= |
| OPENID\_ISSUER | string | The OpenID issuer URL. | OPENID\_ISSUER= |
| OPENID\_SESSION\_SECRET | string | The secret for OpenID session storage. | OPENID\_SESSION\_SECRET= |
| OPENID\_SCOPE | string | The OpenID scope. | OPENID\_SCOPE="openid profile email" |
| OPENID\_CALLBACK\_URL | string | The callback URL for OpenID authentication. | OPENID\_CALLBACK\_URL=/oauth/openid/callback |
| OPENID\_REQUIRED\_ROLE | string | The required role for validation. | OPENID\_REQUIRED\_ROLE= |
| OPENID\_REQUIRED\_ROLE\_TOKEN\_KIND | string | The token kind for required role validation. | OPENID\_REQUIRED\_ROLE\_TOKEN\_KIND= |
| OPENID\_REQUIRED\_ROLE\_PARAMETER\_PATH | string | The parameter path for required role validation. | OPENID\_REQUIRED\_ROLE\_PARAMETER\_PATH= |
| OPENID\_BUTTON\_LABEL | string | The label for the OpenID login button. | OPENID\_BUTTON\_LABEL= |
| OPENID\_IMAGE\_URL | string | The URL of the OpenID login button image. | OPENID\_IMAGE\_URL= |
| OPENID\_USE\_END\_SESSION\_ENDPOINT | string | Whether to use the Issuer End Session Endpoint as a Logout Redirect | OPENID\_USE\_END\_SESSION\_ENDPOINT=TRUE |
| OPENID\_AUTO\_REDIRECT | boolean | Whether to automatically redirect to the OpenID provider. | OPENID\_AUTO\_REDIRECT=true |

#### [LDAP/AD Authentication](https://www.librechat.ai/docs/configuration/authentication/ldap) [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#ldapad-authentication)

For more information: **[LDAP/AD Authentication](https://www.librechat.ai/docs/configuration/authentication/ldap)**

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| LDAP\_URL | string | LDAP server URL. | LDAP\_URL=ldap://localhost:389 |
| LDAP\_BIND\_DN | string | Bind DN | LDAP\_BIND\_DN=cn=root |
| LDAP\_BIND\_CREDENTIALS | string | Password for bindDN | LDAP\_BIND\_CREDENTIALS=password |
| LDAP\_USER\_SEARCH\_BASE | string | LDAP user search base | LDAP\_USER\_SEARCH\_BASE=o=users,o=example.com |
| LDAP\_SEARCH\_FILTER | string | LDAP search filter | LDAP\_SEARCH\_FILTER=mail={{username}} |
| LDAP\_CA\_CERT\_PATH | string | CA certificate path. | LDAP\_CA\_CERT\_PATH=/path/to/root\_ca\_cert.crt |
| LDAP\_TLS\_REJECT\_UNAUTHORIZED | string | LDAP TLS verification | LDAP\_TLS\_REJECT\_UNAUTHORIZED=true |
| LDAP\_STARTTLS | string | Enable LDAP StartTLS for upgrading the connection to TLS. Set to true to enable this feature. | LDAP\_STARTTLS=true |

### Password Reset [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#password-reset)

Email is used for account verification and password reset. See: **[Email setup](https://www.librechat.ai/docs/configuration/authentication/email)**

**Important Note**: All of the service or host, username, and password, and the From address must be set for email to work.

> **Warning**: If using `EMAIL_SERVICE`, **do NOT** set the extended connection parameters:
> HOST, PORT, ENCRYPTION, ENCRYPTION\_HOSTNAME, ALLOW\_SELFSIGNED.
> Failing to set valid values here will result in LibreChat using the unsecured password reset!

See: **[nodemailer well-known-services](https://community.nodemailer.com/2-0-0-beta/setup-smtp/well-known-services/)**

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| EMAIL\_SERVICE | string | Email service (e.g., Gmail, Outlook). | EMAIL\_SERVICE= |
| EMAIL\_HOST | string | Mail server host. | EMAIL\_HOST= |
| EMAIL\_PORT | number | Mail server port. | EMAIL\_PORT=25 |
| EMAIL\_ENCRYPTION | string | Encryption method (starttls, tls, etc.). | EMAIL\_ENCRYPTION= |
| EMAIL\_ENCRYPTION\_HOSTNAME | string | Hostname for encryption. | EMAIL\_ENCRYPTION\_HOSTNAME= |
| EMAIL\_ALLOW\_SELFSIGNED | boolean | Allow self-signed certificates. | EMAIL\_ALLOW\_SELFSIGNED= |
| EMAIL\_USERNAME | string | Username for authentication. | EMAIL\_USERNAME= |
| EMAIL\_PASSWORD | string | Password for authentication. | EMAIL\_PASSWORD= |
| EMAIL\_FROM\_NAME | string | From name. | EMAIL\_FROM\_NAME= |
| EMAIL\_FROM | string | From email address. Required. | EMAIL\_FROM=noreply@librechat.ai |

### Firebase CDN [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#firebase-cdn)

See: **[Firebase CDN Configuration](https://www.librechat.ai/docs/configuration/cdn/firebase)**

⚠️

Important

- If you are using Firebase as your file storage strategy, make sure to set the `file_strategy` option to `firebase` in your `librechat.yaml` configuration file. - For more information on configuring the `librechat.yaml` file, please refer to the YAML Configuration Guide: [Custom Endpoints & Configuration](https://www.librechat.ai/docs/configuration/librechat_yaml)

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| FIREBASE\_API\_KEY | string | The API key for your Firebase project. | FIREBASE\_API\_KEY= |
| FIREBASE\_AUTH\_DOMAIN | string | The Firebase Auth domain for your project. | FIREBASE\_AUTH\_DOMAIN= |
| FIREBASE\_PROJECT\_ID | string | The ID of your Firebase project. | FIREBASE\_PROJECT\_ID= |
| FIREBASE\_STORAGE\_BUCKET | string | The Firebase Storage bucket for your project. | FIREBASE\_STORAGE\_BUCKET= |
| FIREBASE\_MESSAGING\_SENDER\_ID | string | The Firebase Cloud Messaging sender ID. | FIREBASE\_MESSAGING\_SENDER\_ID= |
| FIREBASE\_APP\_ID | string | The Firebase App ID for your project. | FIREBASE\_APP\_ID= |

### UI [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#ui)

#### Help and FAQ Button [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#help-and-faq-button)

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| HELP\_AND\_FAQ\_URL | string | Help and FAQ URL. If empty or commented, the button is enabled. | HELP\_AND\_FAQ\_URL=https://librechat.ai |

**Behaviour:**

Sets the [Cache-Control](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control) headers for static files. These configurations only trigger when the `NODE_ENV` is set to `production`.

Properly setting cache headers is crucial for optimizing the performance and efficiency of your web application. By controlling how long browsers and CDNs store copies of your static files, you can significantly reduce server load, decrease page load times, and improve the overall user experience.

- Uncomment `STATIC_CACHE_MAX_AGE` to change the `max-age` for static files. By default this is set to 4 weeks.
- Uncomment `STATIC_CACHE_S_MAX_AGE` to change the `s-maxage` for static files. By default this is set to 1 week.
  - This is for the _shared cache_, which is used by CDNs and proxies.

#### App Title and Footer [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#app-title-and-footer)

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| APP\_TITLE | string | App title. | APP\_TITLE=LibreChat |
| CUSTOM\_FOOTER | string | Custom footer. | \# CUSTOM\_FOOTER="My custom footer" |

**Behaviour:**

- Uncomment `CUSTOM_FOOTER` to add a custom footer.
- Uncomment and leave `CUSTOM_FOOTER` empty to remove the footer.
- You can now add one or more links in the CUSTOM\_FOOTER value using the following format: `[Anchor text](URL)`. Each link should be delineated with a pipe ( `|`).

> **Markdown example:** `CUSTOM_FOOTER=[Link 1](http://example1.com) | [Link 2](http://example2.com)`

#### Birthday Hat [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#birthday-hat)

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| SHOW\_BIRTHDAY\_ICON | boolean | Show the birthday hat icon. | \# SHOW\_BIRTHDAY\_ICON=true |

**Behaviour:**

- The birthday hat icon will show automatically on February 11th (LibreChat’s birthday).
- Set `SHOW_BIRTHDAY_ICON` to `false` to disable the birthday hat.
- Set `SHOW_BIRTHDAY_ICON` to `true` to enable the birthday hat all the time.

### Analytics [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#analytics)

#### Google Tag Manager [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#google-tag-manager)

LibreChat supports Google Tag Manager for analytics. You will need a Google Tag Manager ID to enable it in LibreChat. Follow [this guide](https://support.google.com/tagmanager/answer/9442095?sjid=10155093630524971297-EU) to generate a Google Tag Manager ID and configure Google Analytics. Then set the `ANALYTICS_GTM_ID` environment variable to your Google Tag Manager ID.

**Note:** If `ANALYTICS_GTM_ID` is not set, Google Tag Manager will not be enabled. If it is set incorrectly, you will see failing requests to `gtm.js`

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| ANALYTICS\_GTM\_ID | string | Google Tag Manager ID. | ANALYTICS\_GTM\_ID= |

### Other [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#other)

#### Redis [Permalink for this section](https://www.librechat.ai/docs/configuration/dotenv\#redis)

**Note:** Redis support is experimental, and you may encounter some problems when using it.

**Important:** If using Redis, you should flush the cache after changing any LibreChat settings.

If you are using Redis, you will need to set the following variables:

- `REDIS_URI`: The URI for your Redis instance.
- `USE_REDIS`: Set to `true` to enable Redis.
- `USE_REDIS_CLUSTER`: Set to `true` to enable Redis Cluster mode.
- `REDIS_CA`: The path to the PEM-encoded certificate authority file for Redis TLS connections.
- `REDIS_KEY_PREFIX`: A prefix to be added to all keys in the Redis database. Defaults to empty string if not specified.
- `REDIS_MAX_LISTENERS`: The maximum number of event listeners allowed for the Redis client instance. It helps prevent memory leaks by limiting event listeners. If set to 0 (zero), it will be considered limitless. Defaults to 10 if not specified.

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| REDIS\_URI | string | Redis URI. | \# REDIS\_URI="10.11.12.13:6379" |
| USE\_REDIS | boolean | Use Redis. | \# USE\_REDIS="true" |
| USE\_REDIS\_CLUSTER | boolean | User Redis Cluster mode | \# USE\_REDIS\_CLUSTER="true" |
| REDIS\_CA | string | Path to certificate | \# REDIS\_CA="/path/to/file.crt" |
| REDIS\_KEY\_PREFIX | string | Prefix for Redis keys | \# REDIS\_KEY\_PREFIX="librechat-staging:" |
| REDIS\_MAX\_LISTENERS | number | Maximum number of event listeners allowed for the Redis client instance | \# REDIS\_MAX\_LISTENERS=20 |

Last updated on April 27, 2025

[Intro](https://www.librechat.ai/docs/configuration "Intro") [Intro](https://www.librechat.ai/docs/configuration/librechat_yaml "Intro")