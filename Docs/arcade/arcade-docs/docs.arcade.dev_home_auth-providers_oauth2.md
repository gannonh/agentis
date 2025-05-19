---
url: "https://docs.arcade.dev/home/auth-providers/oauth2"
title: "Arcade Docs"
---

[Home](https://docs.arcade.dev/home "Home") [Customizing Auth](https://docs.arcade.dev/home/auth-providers "Customizing Auth") OAuth 2.0

# OAuth 2.0 auth provider

The OAuth 2.0 auth provider enables tools and agents to authorize with any OAuth 2.0-compatible API on behalf of a user. Behind the scenes, the Arcade Engine and this auth provider seamlessly manage OAuth 2.0 authorization for your users.

Arcade has [pre-built integrations](https://docs.arcade.dev/home/auth-providers) with many popular
OAuth 2.0 providers. Use this OAuth 2.0 provider to connect to other systems
that aren’t pre-built.

### What’s documented here [Permalink for this section](https://docs.arcade.dev/home/auth-providers/oauth2\#whats-documented-here)

This page describes how to configure OAuth 2.0 with Arcade, and use it in:

- Your [app code](https://docs.arcade.dev/home/auth-providers/oauth2#using-oauth-20-in-app-code) that needs to call APIs protected by OAuth 2.0
- Or, your [custom tools](https://docs.arcade.dev/home/auth-providers/oauth2#using-oauth-20-in-custom-tools) that need to call APIs protected by OAuth 2.0

### Supported OAuth 2.0 flows [Permalink for this section](https://docs.arcade.dev/home/auth-providers/oauth2\#supported-oauth-20-flows)

The only supported OAuth 2.0 flow is the authorization code grant flow (with or without PKCE).

## Configuring OAuth 2.0 [Permalink for this section](https://docs.arcade.dev/home/auth-providers/oauth2\#configuring-oauth-20)

How you configure the OAuth 2.0 provider depends on whether you use the Arcade Cloud Engine or a [self-hosted Engine](https://docs.arcade.dev/home/install/overview). If you use the Cloud Engine, you must configure your provider in the Dashboard.

When configuring your app in the OAuth 2.0 enabled service, you must use `https://cloud.arcade.dev/api/v1/oauth/callback` as the redirect URL (sometimes called callback URL).

### Using the Arcade Dashboard [Permalink for this section](https://docs.arcade.dev/home/auth-providers/oauth2\#using-the-arcade-dashboard)

When using the Arcade Cloud, the Dashboard is available at [`https://api.arcade.dev/dashboard`](https://api.arcade.dev/dashboard). If you are [self-hosting Arcade](https://docs.arcade.dev/home/install/overview), by default the Dashboard is available at [`http://localhost:9099/dashboard`](http://localhost:9099/dashboard). Adjust the host and port, if necessary, to match your environment.

1. Navigate to the OAuth section of the Arcade Dashboard and click **Add OAuth Provider**.
2. Select **OAuth 2.0** as the provider.
3. Choose a unique **ID** for your provider (e.g. “my-oauth2-provider”) with an optional **Description**.
4. Enter your **Client ID** and **Client Secret** from your OAuth 2.0 provider.
5. Click **Save**.

When you use tools that require OAuth 2.0 authorization using your Arcade account credentials, the Arcade Engine will automatically use this OAuth 2.0 provider.

### Using the `engine.yaml` configuration file [Permalink for this section](https://docs.arcade.dev/home/auth-providers/oauth2\#using-the-engineyaml-configuration-file)

This method is only available when you are [self-hosting the engine](https://docs.arcade.dev/home/install/overview)

### Set environment variables [Permalink for this section](https://docs.arcade.dev/home/auth-providers/oauth2\#set-environment-variables)

Set the following environment variables. Replace `HOOLI` with the name of the OAuth 2.0 provider you are configuring:

```nextra-code
export HOOLI_CLIENT_ID="<your client ID>"
export HOOLI_CLIENT_SECRET="<your client secret>"
```

Or, you can set these values in a `.env` file:

```nextra-code
HOOLI_CLIENT_ID="<your client ID>"
HOOLI_CLIENT_SECRET="<your client secret>"
```

See [configuration](https://docs.arcade.dev/home/configure/engine) for more information on how to set
environment variables and configure the Arcade Engine.

### Edit the Engine configuration [Permalink for this section](https://docs.arcade.dev/home/auth-providers/oauth2\#edit-the-engine-configuration)

To locate the `engine.yaml` file in your OS after installing the Arcade Engine, check the [Engine configuration file](https://docs.arcade.dev/home/configure/overview#engine-configuration-file) documentation.

Edit the `engine.yaml` file and add a new item to the `auth.providers` section:

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

    - id: hooli
      description: Hooli OAuth 2.0 provider
      enabled: true
      type: oauth2
      client_id: ${env:HOOLI_CLIENT_ID}
      client_secret: ${env:HOOLI_CLIENT_SECRET}
      oauth2:
        # For a custom OAuth 2.0 provider, specify the full OAuth configuration:
```

The ID of the provider ( `hooli` in this example) can be any string. It’s used to reference the provider in your app code and must be unique.

Each service expects a slightly different set of values in the `oauth2` section. Refer to the configuration reference below, and to your service’s documentation to understand what values are required.

If you need help configuring a specific provider, [get in touch with\\
us](mailto:contact@arcade.dev)!

### Configuration reference [Permalink for this section](https://docs.arcade.dev/home/auth-providers/oauth2\#configuration-reference)

For a full example, see the [full configuration example](https://docs.arcade.dev/home/auth-providers/oauth2#full-configuration-example) below.

`scope_delimiter` _(optional, defaults to the space character)_: The delimiter to use between scopes.

`pkce` _(optional)_:

- `enabled` _(optional, default `false`)_: If `true`, PKCE will be used.
- `code_challenge_method` _(optional, default `S256`)_: The code challenge method to use. The only supported method is `S256`. This parameter is ignored if PKCE is not enabled.

#### `authorize_request` [Permalink for this section](https://docs.arcade.dev/home/auth-providers/oauth2\#authorize_request)

This section configures the initial authorization request.

- `endpoint`: The authorization endpoint for your OAuth 2.0 server, e.g. `/oauth2/authorize`
- `params`: A map of parameter keys and values to include in the authorization request.

These placeholders are available in `params`:

- `{{client_id}}`: The configured client ID.
- `{{redirect_uri}}`: The redirect URI managed by Arcade.
- `{{scopes}}`: The scopes to request, if any
- `{{existing_scopes}}`: The scopes that the user has already granted, if any.

The `state` parameter is automatically added to the request, and does not need
to be included in `params`. If PKCE is enabled, `code_challenge` and
`code_challenge_method` are also added automatically.

For most providers, `oauth2.authorize_request` will look like:

```nextra-code
authorize_request:
  endpoint: 'https://example.com/oauth2/authorize'
  params:
    response_type: code
    client_id: '{{client_id}}'
    redirect_uri: '{{redirect_uri}}'
    scope: '{{scopes}} {{existing_scopes}}'
```

Some providers support additional parameters in the authorization request. These can be added to `params` as well. For example:

```nextra-code
authorize_request:
  endpoint: 'https://example.com/oauth2/authorize'
  params:
    response_type: code
    client_id: '{{client_id}}'
    redirect_uri: '{{redirect_uri}}'
    scope: '{{scopes}} {{existing_scopes}}'
    prompt: consent
    access_type: offline
```

#### `token_request` [Permalink for this section](https://docs.arcade.dev/home/auth-providers/oauth2\#token_request)

This section configures the code/token exchange request, after the user has approved access to your app.

- `endpoint`: The token endpoint for your OAuth 2.0 server, e.g. `/oauth2/token`
- `auth_method` _(optional, default none)_: The authentication method to use. Supported values are none (omitted) and `client_secret_basic`.
- `params`: A map of parameter keys and values to include in the token request.

These placeholders are available in `params`:

- `{{client_id}}`: The configured client ID.
- `{{client_secret}}`: The configured client secret.
- `{{redirect_uri}}`: The redirect URI managed by Arcade.

The `code` parameter is automatically added to the request, and does not need
to be included in `params`. If PKCE is enabled, the `code_verifier` parameter
is also added to the request automatically.

For most providers, `oauth2.token_request.params` will look like:

```nextra-code
token_request:
  endpoint: 'https://example.com/oauth2/token'
  params:
    grant_type: authorization_code
    redirect_uri: '{{redirect_uri}}'
    client_id: '{{client_id}}'
    client_secret: '{{client_secret}}' # Omit if using PKCE
```

- `response_content_type` _(optional, default `application/json`)_: The expected content type of the response. Supported values are `application/json` and `application/x-www-form-urlencoded`.
- `response_map` _(optional)_: A map of keys and values to extract from the response. Supports simple JSONPath expressions. Only applicable if `response_content_type` is `application/json`. See the [JSONPath reference](https://docs.arcade.dev/home/auth-providers/oauth2#jsonpath-expressions-in-response_map) for details on extracting values using JSONPath.

#### `refresh_request` [Permalink for this section](https://docs.arcade.dev/home/auth-providers/oauth2\#refresh_request)

This section configures the refresh token request, if your OAuth 2.0 server supports refresh tokens. If not provided, refresh tokens will not be used.

- `endpoint`: The refresh token endpoint for your OAuth 2.0 server, e.g. `/oauth2/token`
- `auth_method` _(optional, default none)_: The authentication method to use. Supported values are none (omitted), `client_secret_basic`, and `bearer_access_token`.
- `params`: A map of parameter keys and values to include in the refresh token request.

These placeholders are available in `params`:

- `{{refresh_token}}`: The refresh token to use.
- `{{client_id}}`: The configured client ID.
- `{{client_secret}}`: The configured client secret.

For most providers, `oauth2.refresh_request.params` will look like:

```nextra-code
refresh_request:
  endpoint: 'https://example.com/oauth2/token'
  params:
    grant_type: refresh_token
    client_id: '{{client_id}}'
    client_secret: '{{client_secret}}'
```

- `response_content_type` _(optional, default `application/json`)_: The expected content type of the response. Supported values are `application/json` and `application/x-www-form-urlencoded`.
- `response_map` _(optional)_: A map of keys and values to extract from the response. Supports simple JSONPath expressions. Only applicable if `response_content_type` is `application/json`. See the [JSONPath reference](https://docs.arcade.dev/home/auth-providers/oauth2#jsonpath-expressions-in-response_map) for details on extracting values using JSONPath.

#### `user_info_request` [Permalink for this section](https://docs.arcade.dev/home/auth-providers/oauth2\#user_info_request)

Some OAuth 2.0 APIs provide a user info endpoint that returns information about the user. Arcade Engine can automatically request user info from servers that support it. If the `user_info_request` section is omitted, user info will not be requested.

- `endpoint`: The user info endpoint for your OAuth 2.0 server, e.g. `/oauth2/userinfo`
- `auth_method` _(optional, default `bearer_access_token`)_: The authentication method to use. The only supported value is `bearer_access_token`.
- `response_content_type` _(optional, default `application/json`)_: The expected content type of the response. The only supported value is `application/json`.
- `triggers`: Controls when the user info request is made.
  - `on_token_grant`: If `true`, the user info request will be made when a token is granted. This is typically only once for each user, unless new scopes are granted.
  - `on_token_refresh`: If `true`, the user info request will be made every time a token is refreshed.

#### `token_introspection_request` [Permalink for this section](https://docs.arcade.dev/home/auth-providers/oauth2\#token_introspection_request)

Some OAuth 2.0 APIs provide a token introspection endpoint that can be used to check the validity of a token and retrieve additional information such as token expiration time.

An example of a token introspection request configuration:

```nextra-code
auth:
  providers:
    - id: custom-provider
      description: "Custom provider"
      enabled: true
      type: oauth2
      client_id: ${env:CUSTOM_CLIENT_ID}
      client_secret: ${env:CUSTOM_CLIENT_SECRET}
      oauth2:
        token_introspection_request:
          enabled: true
          endpoint: 'https://example.oauth.com/services/oauth2/introspect'
          method: POST
          params:
            token: '{{access_token}}'
          auth_method: 'client_secret_basic'
          request_content_type: application/x-www-form-urlencoded
          response_content_type: application/json
          response_map:
            expires_in: '$.exp'
            scope: '$.scope'
          expiration_format: absolute_unix_timestamp
          triggers:
            on_token_grant: true
            on_token_refresh: true
```

- `enabled` _(optional, default `false`)_: If `true`, the token introspection request will be made.
- `endpoint` _(required)_: The endpoint to use for the token introspection request.
- `method` _(optional, default `GET`)_: The HTTP method to use for the token introspection request.
- `params` _(optional)_: A map of parameter keys and values to include in the token introspection request. Currently, only mapping a field to the internal `access_token` field is supported.
- `auth_method` _(optional, default `client_secret_basic`)_: The authentication method to use for the token introspection request. Supported values are `client_secret_basic` and `bearer_access_token`.
- `request_content_type` _(optional, default `application/x-www-form-urlencoded`)_: The content type of the request body.
- `response_content_type` _(optional, default `application/json`)_: The content type of the response body.
- `response_map` _(required)_: A map of keys and values to extract from the response. Supports simple JSONPath expressions. Supported keys are `access_token`, `expires_in`, `refresh_token`, `scope`, and `token_type`.
- `expiration_format` _(optional, default `absolute_unix_timestamp`)_: The format of the expiration time. Supported values are `absolute_unix_timestamp` and `relative_seconds`.
- `triggers` _(required)_: Controls when the token introspection request is made.
  - `on_token_grant`: If `true`, the token introspection request will be made when a token is granted. This is typically only once for each user, unless new scopes are granted.
  - `on_token_refresh`: If `true`, the token introspection request will be made every time a token is refreshed.

#### JSONPath expressions in `response_map` [Permalink for this section](https://docs.arcade.dev/home/auth-providers/oauth2\#jsonpath-expressions-in-response_map)

In the `token_request` and `refresh_request` sections, you can optionally configure a `response_map`. Configuring a response map is useful if your OAuth 2.0 server returns a JSON object with nested properties, or properties with non-standard names.

The typical JSON payload that most OAuth 2.0 servers return looks like this:

```nextra-code
{
  "access_token": "...",
  "refresh_token": "...",
  "expires_in": 3600,
  "scope": "scope1 scope2"
}
```

If your server returns a payload that looks like this, you don’t need `response_map`.

But if your server returns:

```nextra-code
{
  "data": {
    "access_token": "...",
    "expires_in": 3600,
    "refresh_token": "...",
    "scope": "scope1 scope2"
  }
}
```

Then you need to configure `response_map` to extract the properties from inside the `data` object. Use [JSONPath](https://en.wikipedia.org/wiki/JSONPath) expressions to select the properties you need:

```nextra-code
token_request: # or refresh_request
  response_map:
    access_token: "$.data.access_token"
    expires_in: "$.data.expires_in"
    refresh_token: "$.data.refresh_token" # Only needed if refresh tokens are used
    scope: "$.data.scope" # Only needed if scopes are used
```

Not all OAuth 2.0 servers support refresh tokens, or use scopes. The only required properties are `access_token` and `expires_in`.

#### Handling scope arrays [Permalink for this section](https://docs.arcade.dev/home/auth-providers/oauth2\#handling-scope-arrays)

Most OAuth 2.0 servers return scopes as a delimited string, such as `scope1 scope2` or `scope1,scope2`. If your server follows this convention, configuring the top-level `scope_delimiter` property in the `oauth2` section is all you need to do.

Some OAuth 2.0 servers return an array of scopes instead of a delimited string. For example:

```nextra-code
{
  "access_token": "...",
  "expires_in": 3600,
  "scope": ["scope1", "scope2"]
}
```

In this case, you need to use the `join()` function in `response_map` to join the scopes into a delimited string:

```nextra-code
token_request:
  response_map:
    access_token: "$.access_token"
    expires_in: "$.expires_in"
    scope: "join('$.scope', ' ')"
```

`join()` takes two arguments:

- `path`: The JSONPath expression to select the array to join.
- `delimiter`: The delimiter to use between array elements. Make sure this matches the `scope_delimiter` setting in the `oauth2` section.

#### Extracting values from JWTs [Permalink for this section](https://docs.arcade.dev/home/auth-providers/oauth2\#extracting-values-from-jwts)

Some OAuth 2.0 servers return JWT tokens that contain claims you might need to extract. For example, the token might contain scopes or other information about the user. You can use the `jwt_decode()` function in `response_map` to extract values from JWT tokens:

```nextra-code
token_request:
  response_map:
    access_token: "$.access_token"
    expires_in: "$.expires_in"
    scope: "jwt_decode('$.access_token', '$.scope')"
```

`jwt_decode()` takes two arguments:

- `token_path`: The JSONPath expression to select the JWT token.
- `claim_path`: The JSONPath expression to select the claim within the decoded JWT payload.

If the claim is an array (like scopes often are), you can combine `jwt_decode()` with `join()` to extract and format the values:

```nextra-code
token_request:
  response_map:
    access_token: "$.access_token"
    expires_in: "$.expires_in"
    scope: "join(jwt_decode('$.access_token', '$.scp'), ' ')"
```

This is particularly useful when the JWT token contains scopes in an array format (like `scp: ["scope1", "scope2"]`) and you need to convert them to a space-delimited string.

You can also extract nested claims from the JWT payload using dot notation in the claim path:

```nextra-code
token_request:
  response_map:
    access_token: "$.access_token"
    expires_in: "$.expires_in"
    scope: "jwt_decode('$.access_token', '$.nested.scopes')"
```

#### Full configuration example [Permalink for this section](https://docs.arcade.dev/home/auth-providers/oauth2\#full-configuration-example)

Here’s a full example of the YAML configuration for a custom OAuth 2.0 provider:

Click to view example

## Using OAuth 2.0 in app code [Permalink for this section](https://docs.arcade.dev/home/auth-providers/oauth2\#using-oauth-20-in-app-code)

Use the OAuth 2.0 auth provider in your own agents and AI apps to get a user token for any OAuth 2.0-compatible APIs. See [authorizing agents with Arcade](https://docs.arcade.dev/home/auth/how-arcade-helps) to understand how this works.

Use `client.auth.start()` to get an access token:

PythonJavaScript

```nextra-code
from arcadepy import Arcade

client = Arcade()  # Automatically finds the `ARCADE_API_KEY` env variable


user_id = "user@example.com"

# Start the authorization process
auth_response = client.auth.start(
    user_id=user_id,
    provider="hooli",
    scopes=["scope1", "scope2"],
)

if auth_response.status != "completed":
    print("Please complete the authorization challenge in your browser:")
    print(auth_response.url)

# Wait for the authorization to complete
auth_response = client.auth.wait_for_completion(auth_response)

token = auth_response.context.token
# TODO: Do something interesting with the token...
```

```nextra-code
import { Arcade } from "@arcadeai/arcadejs";

const client = new Arcade(); // Automatically finds the `ARCADE_API_KEY` env variable

const userId = "user@example.com";

// Start the authorization process
let authResponse = await client.auth.start(userId, "hooli", [\
  "scope1",\
  "scope2",\
]);

if (authResponse.status !== "completed") {
  console.log("Please complete the authorization challenge in your browser:");
  console.log(authResponse.url);
}

// Wait for the authorization to complete
authResponse = await client.auth.waitForCompletion(authResponse);

const token = authResponse.context.token;
// TODO: Do something interesting with the token...
```

## Using OAuth 2.0 in custom tools [Permalink for this section](https://docs.arcade.dev/home/auth-providers/oauth2\#using-oauth-20-in-custom-tools)

You can author your own [custom tools](https://docs.arcade.dev/home/build-tools/create-a-toolkit) that interact with any OAuth 2.0-compatible APIs.

Use the `OAuth2()` auth class to specify that a tool requires OAuth 2.0 authorization. In your tool function, `context.authorization` will be automatically populated with the following properties:

- `context.authorization.token` contains the user’s access token.
- If `oauth2.user_info_request` is configured, the user info will be fetched and placed in `context.authorization.user_info`. The data payload is specific to each provider.

```nextra-code
from typing import Annotated

from arcade.sdk import ToolContext, tool
from arcade.sdk.auth import OAuth2


@tool(
    requires_auth=OAuth2(
        provider_id="hooli",
        scopes=["scope1", "scope2"],
    )
)
async def reticulate_splines(
    context: ToolContext,
    num_splines: Annotated[int, "The number of splines to reticulate"],
):
    """Reticulate the specified number of splines."""

    # Get an access token to call an API
    token = context.authorization.token

    # Get user info (if configured and supported by the OAuth 2.0 server):
    user_id = context.authorization.user_info.get("sub")
```

[Notion](https://docs.arcade.dev/home/auth-providers/notion "Notion") [Reddit](https://docs.arcade.dev/home/auth-providers/reddit "Reddit")