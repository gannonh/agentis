---
url: "https://www.librechat.ai/docs/configuration/authentication/email"
title: "GitHub"
---

Docs

⚙️ Configuration

Authentication

Email setup

# Email verification and Password Reset

For a quick overview, refer to the user guide provided here: [Password Reset](https://www.librechat.ai/docs/features/password_reset)

## General setup [Permalink for this section](https://www.librechat.ai/docs/configuration/authentication/email\#general-setup)

**Basic Configuration**

If you want to use one of the predefined services, configure only these variables:
For more info about supported email services: [https://community.nodemailer.com/2-0-0-beta/setup-smtp/well-known-services/](https://community.nodemailer.com/2-0-0-beta/setup-smtp/well-known-services/)

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| EMAIL\_SERVICE | string | Email service (e.g., Gmail, Outlook). | EMAIL\_SERVICE= |
| EMAIL\_USERNAME | string | Username for authentication. | EMAIL\_USERNAME= |
| EMAIL\_PASSWORD | string | Password for authentication. | EMAIL\_PASSWORD= |
| EMAIL\_FROM\_NAME | string | From name. | EMAIL\_FROM\_NAME= |
| EMAIL\_FROM | string | From email address. Required. | EMAIL\_FROM=noreply@librechat.ai |

**Advanced Configuration**

If you want to use a generic SMTP service or need advanced configuration for one of the predefined providers, configure these variables as well:

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| EMAIL\_HOST | string | Mail server host. | EMAIL\_HOST= |
| EMAIL\_PORT | number | Mail server port. | EMAIL\_PORT=25 |
| EMAIL\_ENCRYPTION | string | Encryption method (starttls, tls, etc.). | EMAIL\_ENCRYPTION= |
| EMAIL\_ENCRYPTION\_HOSTNAME | string | Hostname for encryption. | EMAIL\_ENCRYPTION\_HOSTNAME= |
| EMAIL\_ALLOW\_SELFSIGNED | boolean | Allow self-signed certificates. | EMAIL\_ALLOW\_SELFSIGNED= |

⚠️

Warning

**Failing to perform either of the below setups will result in LibreChat using the unsecured password reset! This allows anyone to reset any password on your server immediately, without mail being sent at all!**

## Setup with Gmail [Permalink for this section](https://www.librechat.ai/docs/configuration/authentication/email\#setup-with-gmail)

To set up Gmail, follow these steps:

1. Create a Google Account and enable 2-step verification.
2. In the **[Google Account settings](https://myaccount.google.com/)**, click on the “Security” tab and open “2-step verification.”
3. Scroll down and open “App passwords.” Choose “Mail” for the app and select “Other” for the device, then give it a random name.
4. Click on “Generate” to create a password, and copy the generated password.
5. In the `.env` file, modify the variables as follows:

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| EMAIL\_SERVICE | string | gmail | EMAIL\_SERVICE=gmail |
| EMAIL\_USERNAME | string | your-email | EMAIL\_USERNAME=your-email |
| EMAIL\_PASSWORD | string | your-email-password | EMAIL\_PASSWORD=your-email-password |
| EMAIL\_FROM | string | email address for the from field, e.g., noreply@librechat.ai | EMAIL\_FROM=noreply@librechat.ai |
| EMAIL\_FROM\_NAME | string | My LibreChat Server | EMAIL\_FROM\_NAME=LibreChat |

## Setup with custom mail server [Permalink for this section](https://www.librechat.ai/docs/configuration/authentication/email\#setup-with-custom-mail-server)

To set up a custom mail server, follow these steps:

1. Gather your SMTP login data from your provider. The steps are different for each, but they will usually list values for all variables.
2. In the `.env` file, modify the variables as follows, assuming some sensible example values:

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| EMAIL\_HOST | string | Hostname to connect to | EMAIL\_HOST=mail.example.com |
| EMAIL\_PORT | integer | Port to connect to | EMAIL\_PORT=25 |
| EMAIL\_ENCRYPTION | string | Encryption type | EMAIL\_ENCRYPTION=starttls |
| EMAIL\_USERNAME | string | Your email username | EMAIL\_USERNAME=usernale@example.com |
| EMAIL\_PASSWORD | string | Your app password | EMAIL\_PASSWORD=password |
| EMAIL\_FROM | string | Email address for the from field | EMAIL\_FROM=noreply@librechat.ai |
| EMAIL\_FROM\_NAME | string | Name that will appear in the "from" field | EMAIL\_FROM\_NAME=LibreChat |

Last updated on April 27, 2025

[Authentik](https://www.librechat.ai/docs/configuration/authentication/OAuth2-OIDC/authentik "Authentik") [LDAP/AD](https://www.librechat.ai/docs/configuration/authentication/ldap "LDAP/AD")