## Conposio Support Response

Thanks for the details. Looks like the connection is initiated via the `COMPOSIO_INITIATE_CONNECTION` tool, which creates connections with `default` as the entityId/userId. That's the expected behavior. Please use the [API](https://docs.composio.dev/api-reference/api-reference/v3/connected-accounts/post-connected-accounts) or SDK to create connections by specifying the entityId. Once created, you can append the entityId/userId to the MCP server URL. Learn more here: https://docs.composio.dev/mcp/introduction#client-applications-connect-to-the-server

https://docs.composio.dev/api-reference/api-reference/v3/connected-accounts/post-connected-accounts

https://docs.composio.dev/mcp/introduction
