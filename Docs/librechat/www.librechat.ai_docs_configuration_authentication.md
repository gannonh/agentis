---
url: "https://www.librechat.ai/docs/configuration/authentication"
title: "GitHub"
---

Docs

⚙️ Configuration

Authentication

Intro

# Basic Configuration:

## General [Permalink for this section](https://www.librechat.ai/docs/configuration/authentication\#general)

For a quick overview, refer to the user guide provided here: [Authentication](https://www.librechat.ai/docs/features/authentication)

Here’s an overview of the general configuration.

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| ALLOW\_EMAIL\_LOGIN | boolean | Enable or disable ONLY email login. | ALLOW\_EMAIL\_LOGIN=true |
| ALLOW\_REGISTRATION | boolean | Enable or disable Email registration of new users. | ALLOW\_REGISTRATION=true |
| ALLOW\_SOCIAL\_LOGIN | boolean | Allow users to connect to LibreChat with various social networks. | ALLOW\_SOCIAL\_LOGIN=false |
| ALLOW\_SOCIAL\_REGISTRATION | boolean | Enable or disable registration of new users using various social networks. | ALLOW\_SOCIAL\_REGISTRATION=false |

> **Note:** OpenID does not support the ability to disable only registration.

Quick Tips:

- Even with registration disabled, you can add users directly to the database using [the create-user script](https://www.librechat.ai/docs/configuration/authentication#create-user-script) detailed below.
- To delete a user, you can use [the delete-user script](https://www.librechat.ai/docs/configuration/authentication#delete-user-script) also detailed below.

![register-light](https://github.com/danny-avila/LibreChat/assets/32828263/4c51dc25-31d3-4c51-8c2a-0cdfb5a25033)

![register](https://github.com/danny-avila/LibreChat/assets/32828263/3bc5371d-e51d-4e91-ac68-56db6e85bb2c)

## Session Expiry and Refresh Token [Permalink for this section](https://www.librechat.ai/docs/configuration/authentication\#session-expiry-and-refresh-token)

- Default values: session expiry: 15 minutes, refresh token expiry: 7 days
  - For more information: **[GitHub PR #927 - Refresh Token](https://github.com/danny-avila/LibreChat/pull/927)**

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| SESSION\_EXPIRY | integer (milliseconds) | Session expiry time. | SESSION\_EXPIRY=1000 \* 60 \* 15 |
| REFRESH\_TOKEN\_EXPIRY | integer (milliseconds) | Refresh token expiry time. | REFRESH\_TOKEN\_EXPIRY=(1000 \* 60 \* 60 \* 24) \* 7 |

DatabasePassportServerClientDatabasePassportServerClientIf valid user...Access token expiresIf hashes match...Login request with credentialsUse authentication strategy (e.g., 'local', 'google', etc.)User object or false/errorGenerate access and refresh tokensStore hashed refresh tokenAccess token and refresh tokenStore access token in HTTP Header and refresh token in HttpOnly cookieRequest with access token from HTTP HeaderRequested dataRequest with expired access tokenUnauthorizedRequest with refresh token from HttpOnly cookieRetrieve hashed refresh tokenCompare hash of provided refresh token with stored hashNew access token and refresh tokenRetry request with new access tokenRequested data

## JWT Secret and Refresh Secret [Permalink for this section](https://www.librechat.ai/docs/configuration/authentication\#jwt-secret-and-refresh-secret)

- You should use new secure values. The examples given are 32-byte keys (64 characters in hex).
  - Use this tool to generate some quickly: **[JWT Keys](https://www.librechat.ai/toolkit/creds_generator)**

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| JWT\_SECRET | string (hex) | JWT secret key. | JWT\_SECRET=16f8c0ef4a5d391b26034086c628469d3f9f497f08163ab9b40137092f2909ef |
| JWT\_REFRESH\_SECRET | string (hex) | JWT refresh secret key. | JWT\_REFRESH\_SECRET=eaa5191f2914e30b9387fd84e254e4ba6fc51b4654968a9b0803b456a54b8418 |

* * *

## Automated Moderation System (optional) [Permalink for this section](https://www.librechat.ai/docs/configuration/authentication\#automated-moderation-system-optional)

The Automated Moderation System is enabled by default. It uses a scoring mechanism to track user violations. As users commit actions like excessive logins, registrations, or messaging, they accumulate violation scores. Upon reaching a set threshold, the user and their IP are temporarily banned. This system ensures platform security by monitoring and penalizing rapid or suspicious activities.

To set up the mod system, review [the setup guide](https://www.librechat.ai/docs/configuration/mod_system).

> _Please Note: If you want this to work in development mode, you will need to create a file called `.env.development` in the root directory and set `DOMAIN_CLIENT` to `http://localhost:3090` or whatever port is provided by vite when runnning `npm run frontend-dev`_

## User Management Scripts [Permalink for this section](https://www.librechat.ai/docs/configuration/authentication\#user-management-scripts)

### Create User Script [Permalink for this section](https://www.librechat.ai/docs/configuration/authentication\#create-user-script)

The create-user script allows you to add users directly to the database, even when registration is disabled. Here’s how to use it:

1. For the default `docker-compose.yml` (if you use `docker compose up` to start the app):



```nextra-code
docker-compose exec api npm run create-user

```

2. For the `deploy-compose.yml` (if you followed the [Ubuntu Docker Guide](https://www.librechat.ai/docs/remote/docker_linux)):



```nextra-code
docker exec -it LibreChat-API /bin/sh -c "cd .. && npm run create-user"

```

3. For local development (from project root):



```nextra-code
npm run create-user

```


Follow the prompts to enter the new user’s email and password.

### Delete User Script [Permalink for this section](https://www.librechat.ai/docs/configuration/authentication\#delete-user-script)

To delete a user, you can use the delete-user script:

1. For the default `docker-compose.yml` (if you use `docker compose up` to start the app):



```nextra-code
docker-compose exec api npm run delete-user email@domain.com

```

2. For the `deploy-compose.yml` (if you followed the [Ubuntu Docker Guide](https://www.librechat.ai/docs/remote/docker_linux)):



```nextra-code
docker exec -it LibreChat-API /bin/sh -c "cd .. && npm run delete-user email@domain.com"

```

3. For local development (from project root):



```nextra-code
npm run delete-user email@domain.com

```


Replace `email@domain.com` with the email of the user you want to delete.

Last updated on April 27, 2025

[Shared Endpoint Settings](https://www.librechat.ai/docs/configuration/librechat_yaml/object_structure/shared_endpoint_settings "Shared Endpoint Settings") [Intro](https://www.librechat.ai/docs/configuration/authentication/OAuth2-OIDC "Intro")