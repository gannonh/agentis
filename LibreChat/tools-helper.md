# MCP Tools Helper Guide

## How to Find Tool Names for Configuration

When configuring display names for MCP tools in your `librechat.yaml` file, you need to know the exact tool names. Here's how to find them:

### Method 1: Use the provided helper script

Run the following command to generate a list of all configured MCP servers and tools:

```bash
node config/list-mcp-tools.js
```

This will print a template you can use in your librechat.yaml file.

### Method 2: Use browser developer tools

1. Start the application: `npm run backend:dev` and `npm run frontend:dev`
2. Open your browser and navigate to the app
3. Open the browser developer tools (F12 in most browsers)
4. Navigate to the "Network" tab and filter for XHR requests
5. Go to the Agent Builder or Tools section in the app
6. Click on the server you're interested in (e.g., Google Sheets)
7. Look for requests to `/api/endpoints` or `/api/tools` or similar API calls
8. Examine the response JSON to find the tool names

### Example Configuration for Google Sheets

```yaml
mcpServers:
  googlesheets:
    type: sse
    url: https://mcp.composio.dev/composio/server/89f2e068-a152-4061-a61d-2d03d560fcc6?transport=sse&useComposioHelperActions=true&user_id={{LIBRECHAT_USER_ID}}
    headers:
      X-User-ID: "{{LIBRECHAT_USER_ID}}"
      X-API-Key: "${COMPOSIO_API_KEY}"
      X-Connection-ID: "{{LIBRECHAT_USER_ID}}-googlesheets"
    displayName: "Google Sheets"  # Custom display name for the server
    toolDisplayNames:  # Custom display names for tools
      GOOGLESHEETS_BATCH_GET: "Get Range Data"
      GOOGLESHEETS_BATCH_UPDATE: "Update Range Data"
      COMPOSIO_CHECK_ACTIVE_CONNECTION: "Check Connection"
      COMPOSIO_INITIATE_CONNECTION: "Initialize Connection"
```

## Common Tool Name Patterns

MCP tools often follow these naming patterns:

### Google Sheets
- `GOOGLESHEETS_BATCH_GET`
- `GOOGLESHEETS_BATCH_UPDATE`
- `COMPOSIO_CHECK_ACTIVE_CONNECTION`
- `COMPOSIO_INITIATE_CONNECTION`

### Google Drive
- `GOOGLEDRIVE_LIST_FILES`
- `GOOGLEDRIVE_GET_FILE`
- `GOOGLEDRIVE_CREATE_FILE`
- `GOOGLEDRIVE_UPDATE_FILE`
- `COMPOSIO_CHECK_ACTIVE_CONNECTION`
- `COMPOSIO_INITIATE_CONNECTION`

### GitHub
- `GITHUB_GET_REPO`
- `GITHUB_LIST_COMMITS`
- `GITHUB_CREATE_ISSUE`

## Implementation Notes

The display name implementation in the UI has several layers:

1. **Configuration in librechat.yaml**: This is the source of truth for display names.
2. **Hardcoded values in the frontend**: For common tools, display names are hardcoded in the `getToolDisplayName` function.
3. **Automatic formatting**: If no display name is configured or hardcoded, the tool name is automatically formatted for display.

After making changes to your librechat.yaml file, restart your backend server to see the changes:

```bash
npm run backend:dev
```