#!/bin/bash
# Test script for Playwright MCP server

echo "Testing Playwright MCP server..."
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"
echo "Current directory: $(pwd)"

# Create a simple test that sends an initialization message
cat << 'EOF' | /Users/gannonhall/.local/bin/mcp-npx -y @playwright/mcp@latest --browser=chrome 2>&1
{"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"0.1.0"}},"jsonrpc":"2.0","id":0}
EOF
