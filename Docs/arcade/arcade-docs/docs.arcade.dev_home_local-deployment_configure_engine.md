---
url: "https://docs.arcade.dev/home/local-deployment/configure/engine"
title: "Arcade Docs"
---

[Home](https://docs.arcade.dev/home "Home") [Local Deployment](https://docs.arcade.dev/home/local-deployment/install "Local Deployment") [Configure](https://docs.arcade.dev/home/local-deployment/configure/overview "Configure") Engine

# Arcade Engine configuration

Arcade Engine’s configuration is a [YAML file](https://yaml.org/) with the following sections:

| Section | Description |
| --- | --- |
| API Configuration | Configures the server for specific protocols |
| Auth Configuration | Configures user authorization providers and token storage |
| Cache Configuration | Configures the short-lived cache |
| Security Configuration | Configures security and encryption |
| Storage Configuration | Configures persistent storage |
| Telemetry Configuration | Configures telemetry and observability (OTEL) |
| Tools Configuration | Configures tools for AI models to use |

## Specify a config file [Permalink for this section](https://docs.arcade.dev/home/local-deployment/configure/engine\#specify-a-config-file)

To start the Arcade Engine, pass a config file with `-c` or `--config`:

```nextra-code
arcade-engine -c /path/to/config.yaml
```

Or, for local development:

```nextra-code
arcade dev -c /path/to/config.yaml
```

## Dotenv files [Permalink for this section](https://docs.arcade.dev/home/local-deployment/configure/engine\#dotenv-files)

Arcade Engine automatically loads environment variables from `.env` files in the directory where it was called. Use the `-e` or `--env` flag to specify a path:

```nextra-code
arcade-engine -e .env.dev -c config.yaml
```

## Secrets [Permalink for this section](https://docs.arcade.dev/home/local-deployment/configure/engine\#secrets)

Arcade Engine supports two ways of passing sensitive information like API keys without storing them directly in the config file.

Environment variables:

```nextra-code
topic:
  area:
    - id: primary
      vendor:
        api_key: ${env:OPENAI_API_KEY}
```

External files (useful in cloud setups):

```nextra-code
topic:
  area:
    - id: primary
      vendor:
        api_key: ${file:/path/to/secret}
```

## API configuration [Permalink for this section](https://docs.arcade.dev/home/local-deployment/configure/engine\#api-configuration)

HTTP is the supported protocol for Arcade Engine’s API. The following configuration options are available:

- `api.development` _(optional, default: `false`)_ \- Enable development mode, with more logging and simple [worker authentication](https://docs.arcade.dev/home/configure/engine#http-worker-configuration)
- `api.http.host` _(default: `localhost`)_ \- Address to which Arcade Engine binds its server (e.g., `localhost` or `0.0.0.0`)
- `api.http.read_timeout` _(optional, default: `30s`)_ \- Timeout for reading data from clients
- `api.http.write_timeout` _(optional, default: `1m`)_ \- Timeout for writing data to clients
- `api.http.idle_timeout` _(optional, default: `30s`)_ \- Timeout for idle connections
- `api.http.max_request_body_size` _(optional, default: `4Mb`)_ \- Maximum request body size

A typical configuration for production looks like:

```nextra-code
api:
  development: false
  host: localhost
  port: 9099
```

For local development, set `api.development = true`. In development mode, Arcade Engine does not require [worker authentication](https://docs.arcade.dev/home/configure/engine#http-worker-configuration).

## Auth configuration [Permalink for this section](https://docs.arcade.dev/home/local-deployment/configure/engine\#auth-configuration)

Arcade Engine manages auth for [AI tools](https://docs.arcade.dev/home/auth/auth-tool-calling) and [direct API calls](https://docs.arcade.dev/home/auth/call-third-party-apis-directly). It supports many built-in [auth providers](https://docs.arcade.dev/home/auth-providers), and can also connect to any [OAuth 2.0](https://docs.arcade.dev/home/auth-providers/oauth2) authorization server.

The `auth.providers` section defines the providers that users can authorize with. Each provider must have a unique `id` in the array. There are two ways to configure a provider:

For [built-in providers](https://docs.arcade.dev/home/auth-providers), use the `provider_id` field to reference the pre-built configuration. For example:

```nextra-code
auth:
  providers:
    - id: default-github
      description: The default GitHub provider
      enabled: true
      type: oauth2
      provider_id: github
      client_id: ${env:GITHUB_CLIENT_ID}
      client_secret: ${env:GITHUB_CLIENT_SECRET}
```

For custom OAuth 2.0 providers, specify the full connection details in the `oauth2` sub-section. For full documentation on the custom provider configuration, see the [OAuth 2.0 provider configuration](https://docs.arcade.dev/home/auth-providers/oauth2) page.

You can specify a mix of built-in and custom providers.

## Cache configuration [Permalink for this section](https://docs.arcade.dev/home/local-deployment/configure/engine\#cache-configuration)

The `cache` section configures the short-lived cache.

Configuring the cache is optional. If not configured, the cache will default to an in-memory cache implementation suitable for a single-node Arcade Engine deployment.

The `cache` section has the following configuration options:

- `api_key_ttl` _(optional, default: `10s`)_ \- The time-to-live for API keys in the cache

Two cache implementations are available:

- `in_memory` \- _(default)_ An in-memory cache implementation suitable for a single-node Arcade Engine deployment.
- `redis` \- A Redis cache implementation suitable for a multi-node Arcade Engine deployment:

```nextra-code
cache:
  api_key_ttl: 10s
  redis:
    addr: 'localhost:6379'
    password: ''
    db: 0
```

## Security configuration [Permalink for this section](https://docs.arcade.dev/home/local-deployment/configure/engine\#security-configuration)

The `security` section configures the root encryption keys that the Arcade Engine uses to encrypt and decrypt data at rest. See the [storage configuration](https://docs.arcade.dev/home/local-deployment/configure/engine#storage-configuration) section below to configure where data is stored.

A typical configuration looks like this:

```nextra-code
security:
  root_keys:
    - id: key1
      default: true
      value: ${env:ROOT_KEY_1}
```

Keys should be a long random string of characters. For example:

```nextra-code
openssl rand -base64 32
```

### Default root key [Permalink for this section](https://docs.arcade.dev/home/local-deployment/configure/engine\#default-root-key)

When you [install Arcade Engine locally](https://docs.arcade.dev/home/install/local), an `engine.env` file is created with a default root key:

```nextra-code
# Encryption keys (change this when deploying to production)
ROOT_KEY_1=default-key-value
```

This default value can only be used in development mode (see [API configuration](https://docs.arcade.dev/home/local-deployment/configure/engine#api-configuration) above).

You **must** replace the value of `ROOT_KEY_1` in `engine.env` before deploying to production.

## Storage configuration [Permalink for this section](https://docs.arcade.dev/home/local-deployment/configure/engine\#storage-configuration)

The `storage` section configures the storage backend that the Arcade Engine uses to store persistent data.

There are three storage implementations available:

- `in_memory` \- _(default)_ An in-memory database, suitable for testing.
- `sqlite` \- A SQLite file on disk, suitable for local development:

```nextra-code
storage:
  sqlite:
    # Stores DB in ~/.arcade/arcade-engine.sqlite3
    connection_string: '@ARCADE_HOME/arcade-engine.sqlite3'
```

- `postgres` \- A PostgreSQL database, suitable for production:

```nextra-code
storage:
  postgres:
    user: ${env:POSTGRES_USER}
    password: ${env:POSTGRES_PASSWORD}
    host: ${env:POSTGRES_HOST}
    port: ${env:POSTGRES_PORT}
    db: ${env:POSTGRES_DB}
    sslmode: require
```

## Telemetry configuration [Permalink for this section](https://docs.arcade.dev/home/local-deployment/configure/engine\#telemetry-configuration)

Arcade supports logs, metrics, and traces with [OpenTelemetry](https://opentelemetry.io/).

If you are using the Arcade Engine locally, you can set the `environment` field to `local`. This will only output logs to the console:

```nextra-code
telemetry:
  environment: local
  logging:
    # debug, info, warn, error, fatal
    level: debug
    encoding: console
```

To connect to OpenTelemetry compatible collectors, set the necessary [OpenTelemetry environment variables](https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/) in the `engine.env` file.
`environment` and `version` are fields that are added to the telemetry attributes, which can be filtered on later.

```nextra-code
telemetry:
  environment: prod
  logging:
    level: info
    encoding: console
```

### Notes [Permalink for this section](https://docs.arcade.dev/home/local-deployment/configure/engine\#notes)

- The Engine service name is set to `arcade_engine`
- Traces currently cover the `/v1/health` endpoints, as well as authentication attempts

## Tools configuration [Permalink for this section](https://docs.arcade.dev/home/local-deployment/configure/engine\#tools-configuration)

Arcade Engine orchestrates [tools](https://docs.arcade.dev/home/use-tools/tools-overview) that AI models can use. Tools are executed by distributed workers called **workers**, which are grouped into **directors**.

The `tools.directors` section configures the workers that are available to service tool calls:

```nextra-code
tools:
  directors:
    - id: default
      enabled: true
      max_tools: 64
      workers:
        - id: local_worker
          enabled: true
          http:
            uri: 'http://localhost:8002'
            timeout: 30
            retry: 3
```

When a worker is added to an enabled director, all of the tools hosted by that worker will be available to the model and through the Arcade API.

### HTTP worker configuration [Permalink for this section](https://docs.arcade.dev/home/local-deployment/configure/engine\#http-worker-configuration)

The `http` sub-section configures the HTTP client used to call the worker’s tools:

- `uri` _(required)_ \- The base URL of the worker’s tools
- `secret` _(required)_ \- Secret used to authenticate with the worker
- `timeout` _(optional, default: `30s`)_ \- Timeout for calling the worker’s tools
- `retry` _(optional, default: `3`)_ \- Number of times to retry a failed tool call

Workers must be configured with a `secret` that is used to authenticate with
the worker. This ensures that workers are not exposed to the public internet
without security.

If `api.development = true`, the secret will default to `"dev"` for local development **only**. In production, the secret must be set to a random value.

## Config file version history [Permalink for this section](https://docs.arcade.dev/home/local-deployment/configure/engine\#config-file-version-history)

- 1.0: [Full example](https://raw.githubusercontent.com/ArcadeAI/docs/refs/heads/main/examples/code/home/configuration/engine/full_config.1.0.yaml) and [schema](https://raw.githubusercontent.com/ArcadeAI/schemas/refs/heads/main/engine/config/1.0/schema.json)

[Overview](https://docs.arcade.dev/home/local-deployment/configure/overview "Overview") [Configuring Arcade Deploy](https://docs.arcade.dev/home/local-deployment/configure/arcade-deploy "Configuring Arcade Deploy")