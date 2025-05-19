# Arcade Authentication Testing

This directory contains scripts for testing authentication with Arcade's built-in auth providers.

## Testing Google Authentication

We've created two sets of test scripts:
1. TypeScript scripts (currently having import issues)
2. JavaScript scripts that work directly with the Arcade API

### Simplified Authentication Test (Working)

This script tests the basic authentication flow with Google using Arcade's built-in demo account:

```bash
# Run from the arcade-client package directory
npm run test:simple-auth
```

The script will:
1. Request authorization for the Google toolkit
2. Open a browser window with the Google sign-in page
3. Poll for authentication completion
4. Display the authentication result

✅ **Verified working:** Successfully authenticates with Google's OAuth provider using Arcade's demo account

### Simplified Google API Test (Working)

To test making actual API calls to Google services after authentication:

```bash
# Run from the arcade-client package directory
npm run test:simple-api
```

This script will:
1. Authenticate with Google (or use existing authentication)
2. Prompt you to choose which Google API to test:
   - Gmail (list messages)
   - Calendar (list events)
3. Make the API call and display the results

### Original TypeScript Scripts (Not Working)

These scripts attempt to use the TypeScript client but have module import issues:

```bash
# Run from the arcade-client package directory
npm run test:google-auth  # Basic auth test (has import issues)
npm run test:google-api   # API call test (has import issues)
```

## Test Results

We've confirmed that Google authentication works with Arcade's built-in demo account. The authentication flow successfully:

1. Redirects to Google's OAuth consent screen
2. Requests the necessary scopes (Gmail, Calendar, etc.)
3. Returns access tokens upon successful authentication
4. Provides user information including email and profile details

Using these tokens, we can successfully make API calls to Google services through Arcade.

## Requirements

- Node.js and npm
- Arcade API key in `.env` file
- Callback URL configured in `.env` file
- Network access to Arcade API and Google services

## Configuration

The scripts use the following environment variables from the LibreChat `.env` file:

```
ARCADE_API_KEY=your_api_key
ARCADE_CALLBACK_URL=http://localhost:3080/api/arcade/callback
```

## Troubleshooting

If you encounter issues:

1. Check that both environment variables are correctly set
2. Ensure you have network connectivity to Arcade and Google
3. Check that you have proper permissions to access the APIs
4. Look for error messages in the console output

For more details on authentication testing, see the [GOOGLE_AUTH_TESTING.md](../docs/GOOGLE_AUTH_TESTING.md) document.