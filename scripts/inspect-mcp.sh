#!/bin/bash

export OAUTHLIB_INSECURE_TRANSPORT=1
export WORKSPACE_MCP_PORT=8001
# Launch MCP Inspector with the server
npx @modelcontextprotocol/inspector
