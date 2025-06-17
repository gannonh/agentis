#!/bin/bash

echo "Final comprehensive import fixes..."

# Function to add middleware import to a file
add_middleware_import() {
    local file="$1"
    local middleware="$2"
    
    if [ -f "$file" ]; then
        echo "Adding $middleware to $file"
        
        # Check if the file already imports from middleware.js
        if grep -q "import {.*} from '#server/middleware.js'" "$file"; then
            # Add to existing import
            sed -i '' "s/requireBetterAuth/requireBetterAuth, $middleware/" "$file"
        elif grep -q "import { requireBetterAuth } from '#server/middleware.js'" "$file"; then
            # Simple case with just requireBetterAuth
            sed -i '' "s/import { requireBetterAuth } from/import { requireBetterAuth, $middleware } from/" "$file"
        fi
    fi
}

# Check all route files for missing imports
echo "Scanning for missing imports..."

# Find all route files that use middleware but don't import them
for file in $(find /Users/gannonhall/dev/agentis/LibreChat/api/server/routes -name "*.js"); do
    if [ -f "$file" ]; then
        # Check for checkAdmin usage
        if grep -q "checkAdmin" "$file" && ! grep -q "import.*checkAdmin" "$file"; then
            add_middleware_import "$file" "checkAdmin"
        fi
        
        # Check for generateCheckAccess usage
        if grep -q "generateCheckAccess" "$file" && ! grep -q "import.*generateCheckAccess" "$file"; then
            add_middleware_import "$file" "generateCheckAccess"
        fi
        
        # Check for other common middleware
        for middleware in "checkBan" "uaParser" "validateMessageReq" "logHeaders" "loginLimiter" "registerLimiter"; do
            if grep -q "$middleware" "$file" && ! grep -q "import.*$middleware" "$file"; then
                add_middleware_import "$file" "$middleware"
            fi
        done
    fi
done

echo "Final import fixes complete!"