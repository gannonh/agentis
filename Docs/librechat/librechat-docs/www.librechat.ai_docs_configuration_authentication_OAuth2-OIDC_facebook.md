---
url: "https://www.librechat.ai/docs/configuration/authentication/OAuth2-OIDC/facebook"
title: "GitHub"
---

Docs

⚙️ Configuration

Authentication

OAuth2-OIDC

Facebook

# Facebook - WIP

> ⚠️ **Warning: Work in progress, not currently functional**

> ❗ Note: Facebook Authentication will not work from `localhost`

## Create a Facebook Application [Permalink for this section](https://www.librechat.ai/docs/configuration/authentication/OAuth2-OIDC/facebook\#create-a-facebook-application)

- Go to the **[Facebook Developer Portal](https://developers.facebook.com/)**

- Click on “My Apps” in the header menu


![image](https://github.com/danny-avila/LibreChat/assets/32828263/b75ccb8b-d56b-41b7-8b0d-a32c2e762962)

- Create a new application

![image](https://github.com/danny-avila/LibreChat/assets/32828263/706f050d-5423-44cc-80f0-120913695d8f)

- Select “Authenticate and request data from users with Facebook Login”

![image](https://github.com/danny-avila/LibreChat/assets/32828263/2ebbb571-afe8-429e-ab39-be6e83d12c01)

- Choose “No, I’m not creating a game”

![image](https://github.com/danny-avila/LibreChat/assets/32828263/88b5160a-9c72-414a-bbcc-7717b81106f3)

- Provide an `app name` and `App contact email` and click `Create app`

![image](https://github.com/danny-avila/LibreChat/assets/32828263/e1282c9e-4e7d-4cbe-82c9-cc76967f83e1)

## Facebook Application Configuration [Permalink for this section](https://www.librechat.ai/docs/configuration/authentication/OAuth2-OIDC/facebook\#facebook-application-configuration)

- In the side menu, select “Use cases” and click “Customize” under “Authentication and account creation.”

![image](https://github.com/danny-avila/LibreChat/assets/32828263/39f4bb70-d9dc-4d1c-8443-2666fe56499b)

- Add the `email permission`

![image](https://github.com/danny-avila/LibreChat/assets/32828263/dfa20879-2cb8-4daf-883d-3790854afca0)

- Now click `Go to settings`

![image](https://github.com/danny-avila/LibreChat/assets/32828263/512213a2-bd8b-4fd3-96c7-0de6d3222ddd)

- Ensure that `Client OAuth login`, `Web OAuth login` and `Enforce HTTPS` are **enabled**.

![image](https://github.com/danny-avila/LibreChat/assets/32828263/3a7d935b-97bf-493b-b909-39ecf9b3432b)

- Add a `Valid OAuth Redirect URIs` and “Save changes”
  - Example for a domain: `https://example.com/oauth/facebook/callback`

![image](https://github.com/danny-avila/LibreChat/assets/32828263/ef8e54ee-a766-4871-9719-d4eff7a770b6)

- Click `Go back` and select `Basic` in the `App settings` tab

![image](https://github.com/danny-avila/LibreChat/assets/32828263/0d14f702-5183-422e-a12c-5d1b6031581b)

- Click “Show” next to the App secret.

![image](https://github.com/danny-avila/LibreChat/assets/32828263/9a009e37-2bb6-4da6-b5c7-9139c3db6185)

## .env Configuration [Permalink for this section](https://www.librechat.ai/docs/configuration/authentication/OAuth2-OIDC/facebook\#env-configuration)

- Copy the `App ID` and `App Secret` and paste them into the `.env` file as follows:

.env

```nextra-code
DOMAIN_CLIENT=https://your-domain.com # use http://localhost:3080 if not using a custom domain
DOMAIN_SERVER=https://your-domain.com # use http://localhost:3080 if not using a custom domain

FACEBOOK_CLIENT_ID=your_app_id
FACEBOOK_CLIENT_SECRET=your_app_secret
FACEBOOK_CALLBACK_URL=/oauth/facebook/callback
```

- Save the `.env` file.

> Note: If using docker, run `docker compose up -d` to apply the .env configuration changes

Last updated on April 27, 2025

[Discord](https://www.librechat.ai/docs/configuration/authentication/OAuth2-OIDC/discord "Discord") [GitHub](https://www.librechat.ai/docs/configuration/authentication/OAuth2-OIDC/github "GitHub")