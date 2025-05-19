---
url: "https://www.librechat.ai/docs/configuration/authentication/OAuth2-OIDC/apple"
title: "GitHub"
---

Docs

⚙️ Configuration

Authentication

OAuth2-OIDC

Apple

# Apple

## Prerequisites [Permalink for this section](https://www.librechat.ai/docs/configuration/authentication/OAuth2-OIDC/apple\#prerequisites)

Before you begin, ensure you have the following:

- **Apple Developer Account:** If you don’t have one, enroll [here](https://developer.apple.com/programs/enroll/).

* * *

## Creating a New App ID [Permalink for this section](https://www.librechat.ai/docs/configuration/authentication/OAuth2-OIDC/apple\#creating-a-new-app-id)

### 1\. Log in to the Apple Developer Console [Permalink for this section](https://www.librechat.ai/docs/configuration/authentication/OAuth2-OIDC/apple\#1-log-in-to-the-apple-developer-console)

- **Action:**
- Visit [Apple Developer](https://developer.apple.com/) and sign in with your Apple ID.

### 2\. Navigate to Identifiers [Permalink for this section](https://www.librechat.ai/docs/configuration/authentication/OAuth2-OIDC/apple\#2-navigate-to-identifiers)

- Go to **Certificates, Identifiers & Profiles**.
- Click on **Identifiers** in the sidebar.

### 3\. Create a New App ID [Permalink for this section](https://www.librechat.ai/docs/configuration/authentication/OAuth2-OIDC/apple\#3-create-a-new-app-id)

1. Click the **”+”** button to add a new identifier.
2. Select **App IDs** and click **Continue**.
3. Choose **App** and click **Continue**.
4. Enter a **Description** for your App ID (e.g., `LibreChat App ID`).
5. Set the **Bundle ID** (e.g., `com.yourdomain.librechat`).
6. Click **Continue** and then **Register**.

- **Image References:**

- ![Create App ID](https://user-images.githubusercontent.com/5569219/59017558-6d643600-8861-11e9-927b-a4952b56f34e.png)_Figure 1: Creating a New App ID_

- ![Select App](https://github.com/user-attachments/assets/7b67c1bb-dea0-4475-ad45-e3c13ad514d5)_Figure 2: Selecting App Identifier_


### 4\. Enable “Sign in with Apple” [Permalink for this section](https://www.librechat.ai/docs/configuration/authentication/OAuth2-OIDC/apple\#4-enable-sign-in-with-apple)

1. After creating the App ID, click on it to edit.
2. Under **Capabilities**, find and check **Sign in with Apple**.
3. Click **Save**.

- **Image Reference:**
- ![Enable Sign in with Apple](https://user-images.githubusercontent.com/5569219/59017720-dea3e900-8861-11e9-898e-f486c093edd8.png)_Figure 3: Enabling “Sign in with Apple”_

* * *

## Creating a Services ID [Permalink for this section](https://www.librechat.ai/docs/configuration/authentication/OAuth2-OIDC/apple\#creating-a-services-id)

### 1\. Navigate to Identifiers [Permalink for this section](https://www.librechat.ai/docs/configuration/authentication/OAuth2-OIDC/apple\#1-navigate-to-identifiers)

- In the **Certificates, Identifiers & Profiles** section, click on **Identifiers**.

### 2\. Create a New Services ID [Permalink for this section](https://www.librechat.ai/docs/configuration/authentication/OAuth2-OIDC/apple\#2-create-a-new-services-id)

1. Click the **”+”** button.
2. Select **Services IDs** and click **Continue**.
3. Enter a **Description** (e.g., `LibreChat Services ID`).
4. Enter an **Identifier** (e.g., `com.yourdomain.librechat.services`).
5. Click **Continue** and then **Register**.

- **Image References:**

- ![Select Services ID](https://user-images.githubusercontent.com/5569219/59017808-16ab2c00-8862-11e9-8beb-4da7bb509b0c.png)_Figure 4: Selecting Services ID_

- ![Create Services ID](https://github.com/user-attachments/assets/cac99e43-a6d7-4fb8-890d-eabd87a60e7d)_Figure 5: Creating Services ID_


### 3\. Configure “Sign in with Apple” [Permalink for this section](https://www.librechat.ai/docs/configuration/authentication/OAuth2-OIDC/apple\#3-configure-sign-in-with-apple)

1. Click on the newly created Services ID.
2. Under **Capabilities**, click **Configure** next to **Sign in with Apple**.
3. Enter your **Domains** (e.g., `your-domain.com`) and **Return URLs** (e.g., `https://your-domain.com/oauth/apple/callback`).
4. Click **Next** and then **Register**.

- **Image Reference:**

- ![Configure Sign in with Apple](https://github.com/user-attachments/assets/9309e1c1-6f98-49fc-a87d-bb5f46e200f7)_Figure 6: Configuring “Sign in with Apple” for Services ID_

- ![Web Authentication Configuration](https://github.com/user-attachments/assets/d1ca9ad2-e555-4083-a974-b26239c9694f)_Figure 7: Web Authentication Configuration_

- ![Web Authentication Configuration](https://github.com/user-attachments/assets/8facac9e-002f-458b-8049-63c91afc30de)_Figure 8: Save edit Services ID Configuration_


* * *

## Creating a Key [Permalink for this section](https://www.librechat.ai/docs/configuration/authentication/OAuth2-OIDC/apple\#creating-a-key)

### 1\. Navigate to Keys [Permalink for this section](https://www.librechat.ai/docs/configuration/authentication/OAuth2-OIDC/apple\#1-navigate-to-keys)

- In the **Certificates, Identifiers & Profiles** section, click on **Keys**.

### 2\. Create a New Key [Permalink for this section](https://www.librechat.ai/docs/configuration/authentication/OAuth2-OIDC/apple\#2-create-a-new-key)

1. Click the **”+”** button to add a new key.
2. Enter a **Key Name** (e.g., `LibreChatSignInWithApple`).
3. Select **Sign in with Apple** under **Capabilities**.
4. Click **Configure** and select the created App ID (e.g., `com.yourdomain.librechat`), then click **Save**.
5. Click **Continue** and then **Register**.

- **Image References:**

- ![Create Key](https://github.com/user-attachments/assets/6db095dd-79dd-485d-a57a-8b1ea523b67f)_Figure 8: Creating a New Key_

- ![Configure Key](https://github.com/user-attachments/assets/30b593ab-b8f3-4d94-b56d-1eeac1900a1f)_Figure 9: Configuring the Key with App ID_

- ![Register a New Key](https://github.com/user-attachments/assets/91aa4d6e-9b5c-4f7c-bb1a-5980015ee15d)_Figure 10: Registering the Key_


### 3\. Download the Private Key [Permalink for this section](https://www.librechat.ai/docs/configuration/authentication/OAuth2-OIDC/apple\#3-download-the-private-key)

1. After creating the key, click **Download**.
2. **Important:** Save the `.p8` file securely. You will not be able to download it again.
3. Note the **Key ID**; you’ll need it for the `.env` file.

- **Image Reference:**
- ![Download Your Key](https://github.com/user-attachments/assets/79e5aefa-9797-4fa7-bdf9-cb4b526ab3dd)_Figure 11: Downloading the Private Key_

* * *

## Configuring LibreChat [Permalink for this section](https://www.librechat.ai/docs/configuration/authentication/OAuth2-OIDC/apple\#configuring-librechat)

### 1\. Update `.env` Configuration [Permalink for this section](https://www.librechat.ai/docs/configuration/authentication/OAuth2-OIDC/apple\#1-update-env-configuration)

Add the following Apple OAuth2 configuration to your `.env` file:

.env

```nextra-code
DOMAIN_CLIENT=https://your-domain.com # use http://localhost:3080 if not using a custom domain
DOMAIN_SERVER=https://your-domain.com # use http://localhost:3080 if not using a custom domain

# Apple
APPLE_CLIENT_ID=com.yourdomain.librechat.services
APPLE_TEAM_ID=YOUR_TEAM_ID
APPLE_KEY_ID=YOUR_KEY_ID
APPLE_PRIVATE_KEY_PATH=/path/to/AuthKey.p8 # Absolute path to your downloaded .p8 file
APPLE_CALLBACK_URL=/oauth/apple/callback
```

> **Note:**
>
> - Replace `com.yourdomain.librechat.services` with your actual Services ID.
> - Replace `YOUR_TEAM_ID` and `YOUR_KEY_ID` with the respective values from your Apple Developer account.
> - If using Docker, ensure the `.p8` file is accessible within your Docker container and update the `APPLE_PRIVATE_KEY_PATH` accordingly.

### 2\. Restart LibreChat [Permalink for this section](https://www.librechat.ai/docs/configuration/authentication/OAuth2-OIDC/apple\#2-restart-librechat)

After updating the `.env` file, restart LibreChat to apply the changes.

- **If using Docker:**

```nextra-code
docker compose up -d
```

* * *

## Troubleshooting [Permalink for this section](https://www.librechat.ai/docs/configuration/authentication/OAuth2-OIDC/apple\#troubleshooting)

If you encounter issues during the setup, consider the following solutions:

- **Invalid Redirect URI:**
  - Ensure that the redirect URI in your Apple Developer Console ( `https://your-domain.com/oauth/apple/callback`) matches exactly with the one specified in your `.env` file ( `APPLE_CALLBACK_URL`).
- **Private Key Issues:**
  - Verify that the path to your `.p8` file ( `APPLE_PRIVATE_KEY_PATH`) is correct.
  - Ensure that LibreChat has read permissions for the `.p8` file.
- **Team ID and Key ID Errors:**
  - Double-check that the `APPLE_TEAM_ID` and `APPLE_KEY_ID` in your `.env` file match those in your Apple Developer Account.
- **Domain Verification Failed:**
  - Ensure that the verification file is correctly uploaded to the root of your domain.
  - Verify that there are no typos in the domain name entered during configuration.
- **Docker Configuration Issues:**
  - If using Docker, confirm that the `.p8` file is properly mounted and the path in `APPLE_PRIVATE_KEY_PATH` is accessible within the container.
- **Check Logs:**
  - Review LibreChat logs for any error messages related to Apple authentication. This can provide specific insights into what might be going wrong.

Last updated on April 27, 2025

[Intro](https://www.librechat.ai/docs/configuration/authentication/OAuth2-OIDC "Intro") [Discord](https://www.librechat.ai/docs/configuration/authentication/OAuth2-OIDC/discord "Discord")