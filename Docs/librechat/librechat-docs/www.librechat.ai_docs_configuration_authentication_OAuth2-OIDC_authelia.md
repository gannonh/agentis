---
url: "https://www.librechat.ai/docs/configuration/authentication/OAuth2-OIDC/authelia"
title: "GitHub"
---

Docs

⚙️ Configuration

Authentication

OAuth2-OIDC

Authelia

# Authelia

- Generate a client secret using:


```nextra-code
docker run --rm authelia/authelia:latest authelia crypto hash generate pbkdf2 --variant sha512 --random --random.length 72 --random.charset rfc3986

```

- Then in your `configuration.yml` add the following in the oidc section:


configuration.yml



```nextra-code
  - client_id: 'librechat'
    client_name: 'LibreChat'
    client_secret: '$pbkdf2-GENERATED_SECRET_KEY_HERE'
    public: false
    authorization_policy: 'two_factor'
    redirect_uris:
      - 'https://LIBRECHAT.URL/oauth/openid/callback'
    scopes:
      - 'openid'
      - 'profile'
      - 'email'
    userinfo_signing_algorithm: 'none'
```

- Then restart Authelia

# LibreChat

- Open the `.env` file in your project folder and add the following variables:


.env



```nextra-code
ALLOW_SOCIAL_LOGIN=true
OPENID_BUTTON_LABEL='Log in with Authelia'
OPENID_ISSUER=https://auth.example.com/.well-known/openid-configuration
OPENID_CLIENT_ID=librechat
OPENID_CLIENT_SECRET=ACTUAL_GENERATED_SECRET_HERE
OPENID_SESSION_SECRET=ANY_RANDOM_STRING
OPENID_CALLBACK_URL=/oauth/openid/callback
OPENID_SCOPE="openid profile email"
OPENID_IMAGE_URL=https://www.authelia.com/images/branding/logo-cropped.png
# Optional: redirects the user to the end session endpoint after logging out
OPENID_USE_END_SESSION_ENDPOINT=true
```


Last updated on April 27, 2025

[Keycloak](https://www.librechat.ai/docs/configuration/authentication/OAuth2-OIDC/keycloak "Keycloak") [Authentik](https://www.librechat.ai/docs/configuration/authentication/OAuth2-OIDC/authentik "Authentik")