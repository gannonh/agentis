#!/bin/bash

# Fix import issues caused by the sed script

echo "Fixing import issues in route files..."

# For files that use checkBan, uaParser, or other middleware, make sure they're imported
files_with_issues=(
    "/Users/gannonhall/dev/agentis/LibreChat/api/server/routes/assistants/index.js"
    "/Users/gannonhall/dev/agentis/LibreChat/api/server/routes/messages.js"
    "/Users/gannonhall/dev/agentis/LibreChat/api/server/routes/edit/index.js"
)

for file in "${files_with_issues[@]}"; do
    if [ -f "$file" ]; then
        echo "Checking $file..."
        
        # Check if file uses middleware functions but doesn't import them
        if grep -q "checkBan\|uaParser\|validateMessageReq" "$file" && ! grep -q "import.*checkBan\|import.*uaParser\|import.*validateMessageReq" "$file"; then
            echo "Fixing imports in $file"
            
            # Replace the import line to include missing middleware
            if grep -q "import { requireBetterAuth } from" "$file"; then
                sed -i '' 's/import { requireBetterAuth } from/import { requireBetterAuth, checkBan, uaParser, validateMessageReq } from/' "$file"
            elif grep -q "import {.*requireBetterAuth.*} from" "$file"; then
                # More complex case - add to existing import
                sed -i '' 's/requireBetterAuth/requireBetterAuth, checkBan, uaParser, validateMessageReq/' "$file"
            fi
        fi
    fi
done

echo "Import fixes complete!"