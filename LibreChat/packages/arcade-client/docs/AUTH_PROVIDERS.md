# Arcade Authentication Providers

This document outlines the authentication requirements for various Arcade toolkits based on our analysis. Each toolkit may require different authentication methods, typically OAuth2 for third-party services.

## Setup and Configuration

Due to compatibility issues between the Arcade CLI and Python 3.13, we've created a patched virtual environment with Python 3.12. The following setup is required:

1. Create a Python 3.12 virtual environment:
   ```bash
   python3.12 -m venv .venv-arcade
   ```

2. Install Arcade CLI:
   ```bash
   source .venv-arcade/bin/activate
   pip install arcade-ai
   ```

3. Patch the Typer library to work with Python 3.12/3.13:
   ```python
   # Edit .venv-arcade/lib/python3.12/site-packages/typer/rich_utils.py
   # Replace:
   metavar_str = param.make_metavar()
   
   # With:
   try:
       metavar_str = param.make_metavar(ctx)
   except TypeError:
       # Fall back to old behavior for backwards compatibility
       metavar_str = param.make_metavar()
   ```

4. Set up NPM scripts to use the patched virtual environment (already done).

## Available Toolkits

Based on `arcade show` output, the following toolkits are available:

1. **CodeSandbox** - Code execution environment
2. **Dropbox** - File storage and management
3. **Github** - Repository management and interactions
4. **Google** - Various Google services (Gmail, Calendar, Docs, Sheets, etc.)
5. **Hubspot** - CRM and marketing tools
6. **LinkedIn** - Professional networking platform
7. **Search** - Web search capabilities 
8. **Slack** - Team collaboration platform
9. **Spotify** - Music streaming service
10. **Stripe** - Payment processing
11. **Web** - Web scraping and crawling
12. **X (Twitter)** - Social media platform
13. **Zoom** - Video conferencing

## Authentication Requirements

### OAuth-based Authentication Flow

Most of these toolkits use OAuth2 for authentication. The general flow is:

1. User initiates an action requiring authentication
2. System redirects to the service's auth page
3. User approves permission request
4. Service returns an auth token
5. System stores the token for future requests

### Authentication Requirements by Toolkit

| Toolkit | Auth Type | Required Permissions | Notes |
|---------|-----------|----------------------|-------|
| **CodeSandbox** | None | N/A | Code execution doesn't require user authentication |
| **Dropbox** | OAuth2 | Files access | Read/write access to files and folders |
| **Github** | OAuth2 | Repo, issues, PRs | Different scopes needed based on actions |
| **Google** | OAuth2 | Multiple scopes | Separate permissions for Mail, Calendar, Drive, etc. |
| **Hubspot** | OAuth2 | CRM access | Access to contacts, companies, deals |
| **LinkedIn** | OAuth2 | Content publishing | Profile and posts permissions |
| **Search** | API Key | N/A | Service-level API keys, not user authentication |
| **Slack** | OAuth2 | Channels, messages | Read and post message permissions |
| **Spotify** | OAuth2 | Playback control | Control playback and read user's library |
| **Stripe** | API Key | N/A | Account-level API keys |
| **Web** | API Key | N/A | Service-level API keys for web crawling |
| **X (Twitter)** | OAuth2 | Read/Write tweets | Post and read tweet permissions |
| **Zoom** | OAuth2 | Meetings access | View and schedule meeting permissions |

## Testing Authentication

To test authentication for these providers:

1. Ensure you're in the virtual environment with the patched Arcade CLI:
   ```bash
   source .venv-arcade/bin/activate
   ```

2. Start a chat session:
   ```bash
   arcade chat --model gpt-4o
   ```

3. Ask the model to use a tool that requires authentication (e.g., Google.ListCalendars)

4. The system will prompt for authentication if needed, showing a URL for OAuth flow

5. After completing authentication, the tool should be able to access the requested resources

## Callback URL Requirements

For OAuth authentication flows, a callback URL needs to be configured where the service redirects after authorization:

- Development: `http://localhost:3080/api/arcade/callback`
- Production: `https://{your-domain}/api/arcade/callback`

This URL should be configured in the OAuth provider settings for each service and in your Arcade Cloud account.

## Environment Variables

Authentication is configured using the following environment variables:

```
ARCADE_API_KEY=your_api_key
ARCADE_CALLBACK_URL=https://your-agentis-instance.com/api/arcade/callback
```

We've confirmed our API key is already set up in the LibreChat/.env file.

## NPM Scripts for Arcade CLI

The following NPM scripts have been set up for working with the Arcade CLI:

```json
"arcade:login": "source ../../../.venv-arcade/bin/activate && arcade login",
"arcade:chat": "source ../../../.venv-arcade/bin/activate && arcade chat --model gpt-4o",
"arcade:list": "source ../../../.venv-arcade/bin/activate && arcade show",
"arcade:logs": "source ../../../.venv-arcade/bin/activate && arcade worker logs --follow",
"arcade:help": "source ../../../.venv-arcade/bin/activate && arcade --help"
```

## Implementation Notes

For the Agentis integration, we'll need to:

1. Implement proper token storage and refresh mechanisms
2. Track user authentication status in user profiles
3. Create a reauthorization flow for expired tokens
4. Ensure token security (encryption at rest)
5. Design intuitive UI for authentication flows
6. Handle error cases gracefully