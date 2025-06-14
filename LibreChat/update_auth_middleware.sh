#!/bin/bash

# Script to replace JWT middleware with Better Auth middleware in all route files

echo "Updating authentication middleware in route files..."

# List of route files that use requireJwtAuth
route_files=(
    "/Users/gannonhall/dev/agentis/LibreChat/api/server/routes/categories.js"
    "/Users/gannonhall/dev/agentis/LibreChat/api/server/routes/presets.js"
    "/Users/gannonhall/dev/agentis/LibreChat/api/server/routes/prompts.js"
    "/Users/gannonhall/dev/agentis/LibreChat/api/server/routes/keys.js"
    "/Users/gannonhall/dev/agentis/LibreChat/api/server/routes/assistants/index.js"
    "/Users/gannonhall/dev/agentis/LibreChat/api/server/routes/ask/index.js"
    "/Users/gannonhall/dev/agentis/LibreChat/api/server/routes/auth.js"
    "/Users/gannonhall/dev/agentis/LibreChat/api/server/routes/plugins.js"
    "/Users/gannonhall/dev/agentis/LibreChat/api/server/routes/tags.js"
    "/Users/gannonhall/dev/agentis/LibreChat/api/server/routes/roles.js"
    "/Users/gannonhall/dev/agentis/LibreChat/api/server/routes/agents/v1.js"
    "/Users/gannonhall/dev/agentis/LibreChat/api/server/routes/agents/index.js"
    "/Users/gannonhall/dev/agentis/LibreChat/api/server/routes/models.js"
    "/Users/gannonhall/dev/agentis/LibreChat/api/server/routes/bedrock/index.js"
    "/Users/gannonhall/dev/agentis/LibreChat/api/server/routes/edit/index.js"
    "/Users/gannonhall/dev/agentis/LibreChat/api/server/routes/files/index.js"
    "/Users/gannonhall/dev/agentis/LibreChat/api/server/routes/balance.js"
    "/Users/gannonhall/dev/agentis/LibreChat/api/server/routes/composio.js"
    "/Users/gannonhall/dev/agentis/LibreChat/api/server/routes/tokenizer.js"
    "/Users/gannonhall/dev/agentis/LibreChat/api/server/routes/search.js"
    "/Users/gannonhall/dev/agentis/LibreChat/api/server/routes/messages.js"
    "/Users/gannonhall/dev/agentis/LibreChat/api/server/routes/share.js"
    "/Users/gannonhall/dev/agentis/LibreChat/api/server/routes/mcp-diagnostics.js"
)

for file in "${route_files[@]}"; do
    if [ -f "$file" ]; then
        echo "Updating $file..."
        
        # Replace import statements
        sed -i '' 's/import requireJwtAuth from/#server\/middleware\/requireJwtAuth.js/import requireBetterAuth from #server\/middleware\/requireBetterAuth.js/g' "$file"
        sed -i '' 's/import {.*requireJwtAuth.*}/import { requireBetterAuth }/g' "$file"
        sed -i '' 's/requireJwtAuth/requireBetterAuth/g' "$file"
        
        # Also handle cases where it's imported from middleware/index.js
        sed -i '' 's/import {.*requireJwtAuth.*} from '\''#server\/middleware.js'\''/import { requireBetterAuth } from '\''#server\/middleware.js'\''/g' "$file"
        
        echo "Updated $file"
    else
        echo "File not found: $file"
    fi
done

echo "Authentication middleware update complete!"