---
url: "https://www.librechat.ai/docs/configuration/authentication/ldap"
title: "GitHub"
---

Docs

⚙️ Configuration

Authentication

LDAP/AD

# LDAP/AD Server Authentication

You can use a Lightweight Directory Access Protocol (LDAP) authentication server to authenticate users.

## LDAP/AD Server Configuration [Permalink for this section](https://www.librechat.ai/docs/configuration/authentication/ldap\#ldapad-server-configuration)

**Basic Configuration**

- `LDAP_URL` and `LDAP_USER_SEARCH_BASE` are required.
- `LDAP_SEARCH_FILTER` is optional; if not specified, the `mail` attribute is used by default. If specified, use the literal `{{username}}` to use the given username for the search.

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| LDAP\_URL | string | LDAP server URL. | LDAP\_URL=ldap://localhost:389 |
| LDAP\_BIND\_DN | string | Bind DN | LDAP\_BIND\_DN=cn=root |
| LDAP\_BIND\_CREDENTIALS | string | Password for bindDN | LDAP\_BIND\_CREDENTIALS=password |
| LDAP\_USER\_SEARCH\_BASE | string | LDAP user search base | LDAP\_USER\_SEARCH\_BASE=o=users,o=example.com |
| LDAP\_SEARCH\_FILTER | string | LDAP search filter | LDAP\_SEARCH\_FILTER=mail={{username}} |

**Field Mappings**

You can specify a mapping between the attributes of LibreChat users and those of LDAP users. Use these settings if the default mappings do not work properly.

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| LDAP\_ID | string | Specify a unique user ID. By default, uid or sAMAccountName, mail is used. | LDAP\_ID=uid |
| LDAP\_USERNAME | string | By default, it uses givenName or mail. | LDAP\_USERNAME=givenName |
| LDAP\_EMAIL | string | By default, it uses mail. | LDAP\_EMAIL=userPrincipalName |
| LDAP\_FULL\_NAME | string | By default, it uses a combination of givenName and surname. | LDAP\_FULL\_NAME=givenName,surname |

**Username or Email**

By default, LibreChat uses an email address and password for authentication.
This may sometimes cause problem with LDAP and you may want to use a username instead.
Set the `LDAP_SEARCH_FILTER` to filter for the username instead (e.g. `LDAP_SEARCH_FILTER=uid={{username}}`
and configure LibreChat to request login via username:

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| LDAP\_LOGIN\_USES\_USERNAME | string | Use username instead of email. | LDAP\_LOGIN\_USES\_USERNAME=true |

**Active Directory over SSL**

To connect via SSL (ldaps://), such as a company using Windows AD, specify the path to the internal CA certificate.
`LDAP_TLS_REJECT_UNAUTHORIZED` is optional;if not specified LibreChat will reject TLS/SSL connections if the LDAP server’s certificate cannot be verified.
set `LDAP_TLS_REJECT_UNAUTHORIZED` to false (not recommended for production environments)
to allow Librechat to accept TLS/SSL connections even if the LDAP server’s certificate cannot be verified,

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| LDAP\_CA\_CERT\_PATH | string | CA certificate path. | LDAP\_CA\_CERT\_PATH=/path/to/root\_ca\_cert.crt |
| LDAP\_TLS\_REJECT\_UNAUTHORIZED | string | Disable TLS verification | LDAP\_TLS\_REJECT\_UNAUTHORIZED=true |

**LDAP StartTLS**

Enabling LDAP StartTLS allows LibreChat to upgrade an insecure connection to a secure TLS connection. This is useful if you want to secure the connection without switching to ldaps://.

| Key | Type | Description | Example |
| --- | --- | --- | --- |
| LDAP\_STARTTLS | string | Enable LDAP StartTLS for upgrading the connection to TLS. Set to true to enable this feature. | LDAP\_STARTTLS=true |

Last updated on April 27, 2025

[Email setup](https://www.librechat.ai/docs/configuration/authentication/email "Email setup") [MongoDB Atlas](https://www.librechat.ai/docs/configuration/mongodb/mongodb_atlas "MongoDB Atlas")