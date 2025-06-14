#!/bin/bash

echo "Fixing all import issues in route files..."

# List of files that need generateCheckAccess
files_with_generateCheckAccess=(
    "/Users/gannonhall/dev/agentis/LibreChat/api/server/routes/prompts.js"
    "/Users/gannonhall/dev/agentis/LibreChat/api/server/routes/tags.js"
    "/Users/gannonhall/dev/agentis/LibreChat/api/server/routes/agents/v1.js"
    "/Users/gannonhall/dev/agentis/LibreChat/api/server/routes/agents/chat.js"
)

for file in "${files_with_generateCheckAccess[@]}"; do
    if [ -f "$file" ]; then
        echo "Fixing generateCheckAccess import in $file..."
        
        # Check if file uses generateCheckAccess but doesn't import it
        if grep -q "generateCheckAccess" "$file" && ! grep -q "import.*generateCheckAccess" "$file"; then
            # Add generateCheckAccess to existing middleware import
            if grep -q "import { requireBetterAuth } from '#server/middleware.js'" "$file"; then
                sed -i '' 's/import { requireBetterAuth } from/import { requireBetterAuth, generateCheckAccess } from/' "$file"
            elif grep -q "import {.*requireBetterAuth.*} from '#server/middleware.js'" "$file"; then
                # Add to existing import that already has other items
                sed -i '' 's/requireBetterAuth/requireBetterAuth, generateCheckAccess/' "$file"
            fi
        fi
    fi
done

# List of files that may need other middleware imports
files_with_middleware=(
    "/Users/gannonhall/dev/agentis/LibreChat/api/server/routes/tags.js"
)

for file in "${files_with_middleware[@]}"; do
    if [ -f "$file" ]; then
        echo "Checking middleware imports in $file..."
        
        # Check for missing middleware and add them
        if grep -q "checkBan\|uaParser\|validateMessageReq" "$file" && ! grep -q "import.*checkBan\|import.*uaParser\|import.*validateMessageReq" "$file"; then
            echo "Adding missing middleware to $file"
            # Add missing middleware to import
            sed -i '' 's/requireBetterAuth/requireBetterAuth, checkBan, uaParser, validateMessageReq/' "$file"
        fi
    fi
done

echo "All import fixes complete!"